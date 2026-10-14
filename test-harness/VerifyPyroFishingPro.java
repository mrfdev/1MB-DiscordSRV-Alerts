import github.scarsz.discordsrv.util.MessageUtil;
import github.scarsz.discordsrv.util.NamedValueFormatter;
import github.scarsz.discordsrv.util.SpELExpressionBuilder;
import github.scarsz.discordsrv.dependencies.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import github.scarsz.discordsrv.api.events.DiscordGuildMessageSentEvent;
import github.scarsz.discordsrv.dependencies.jda.api.JDA;
import github.scarsz.discordsrv.dependencies.jda.api.entities.Message;
import github.scarsz.discordsrv.dependencies.jda.api.entities.Guild;
import github.scarsz.discordsrv.dependencies.jda.api.entities.SelfUser;
import github.scarsz.discordsrv.dependencies.jda.api.entities.TextChannel;
import github.scarsz.discordsrv.dependencies.jda.api.entities.User;
import me.arsmagica.API.PyroFishCatchEvent;
import me.arsmagica.API.TournamentEndEvent;
import me.arsmagica.API.TournamentStartEvent;
import org.bukkit.entity.Player;
import org.bukkit.event.Event;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;

import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.jar.JarFile;
import java.util.regex.Pattern;

/** Uses the supplied plugin's real public events and DiscordSRV's actual SpEL/formatters. */
public class VerifyPyroFishingPro {
    private static final Pattern EXPRESSIONS = Pattern.compile("\\\\([^\\\\])|\\$\\{(.+?)}");
    private static int checks;

    private static void check(boolean result, String message) {
        checks++;
        if (!result) throw new AssertionError(message);
    }

    private static Player player(String name) {
        return (Player) Proxy.newProxyInstance(Player.class.getClassLoader(), new Class<?>[]{Player.class},
            (proxy, method, args) -> switch (method.getName()) {
                case "getName", "getDisplayName" -> name;
                case "getUniqueId" -> UUID.fromString("11111111-2222-4333-8444-555555555555");
                case "toString" -> "Test player " + name;
                default -> throw new AssertionError("Unexpected player access: " + method.getName());
            });
    }

    public static class FishItem extends ItemStack {
        private final ItemMeta metadata;
        public FishItem(boolean hasMetadata, String displayName) {
            super();
            metadata = !hasMetadata ? null : (ItemMeta) Proxy.newProxyInstance(
                ItemMeta.class.getClassLoader(), new Class<?>[]{ItemMeta.class}, (proxy, method, args) -> switch (method.getName()) {
                    case "hasDisplayName" -> displayName != null;
                    case "getDisplayName" -> displayName;
                    case "toString" -> "Test fish metadata";
                    default -> throw new AssertionError("Unexpected metadata access: " + method.getName());
                });
        }
        @Override public boolean hasItemMeta() { return metadata != null; }
        @Override public ItemMeta getItemMeta() { return metadata; }
    }

    private static Map<?, ?> recipe(Path directory, String slug) throws Exception {
        Map<?, ?> document = new Yaml(new SafeConstructor()).load(Files.readString(directory.resolve(slug + ".yml")));
        return (Map<?, ?>) ((List<?>) document.get("Alerts")).getFirst();
    }

    private static boolean qualifies(Map<?, ?> alert, Object event) {
        if (!event.getClass().getName().equals(alert.get("Trigger"))) return false;
        for (Object condition : (List<?>) alert.get("Conditions")) {
            var expression = new SpELExpressionBuilder((String) condition).withVariable("event", event);
            if (event instanceof DiscordGuildMessageSentEvent sent) {
                expression.withVariable("discordsrv", new RelayConfiguration()).withVariable("jda", sent.getJda());
            }
            Boolean result = expression.evaluate(event, Boolean.class);
            check(result != null, "Condition returned null: " + condition);
            if (!result) return false;
        }
        return true;
    }

    private static String description(Map<?, ?> alert, Object event, String playerName) {
        Map<?, ?> embed = (Map<?, ?>) alert.get("Embed");
        String template = (String) embed.get("Description");
        String expanded = NamedValueFormatter.format(template, EXPRESSIONS, expression ->
            new SpELExpressionBuilder(expression).withVariable("event", event).evaluate(event));
        String result = NamedValueFormatter.format(expanded, key -> key.equals("name") ? playerName : "{" + key + "}");
        check(!result.contains("${") && !result.contains("{name}"), "Unresolved output: " + result);
        return result;
    }

    private static String visible(String message) {
        return PlainTextComponentSerializer.plainText().serialize(MessageUtil.reserializeToMinecraft(message));
    }

    public static class RelayConfiguration {
        public Map<String, String> getChannels() { return Map.of("pfp-results", "private-relay"); }
    }

    private static <T> T fake(Class<T> type, Map<String, Object> methods) {
        return type.cast(Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, (proxy, method, args) -> {
            if (method.getName().equals("toString")) return "Fixture " + type.getSimpleName();
            if (!methods.containsKey(method.getName())) throw new AssertionError("Unexpected access: " + method);
            return methods.get(method.getName());
        }));
    }

    private static DiscordGuildMessageSentEvent relay(String content, String channel, String author, boolean hasEmbed) {
        TextChannel textChannel = fake(TextChannel.class, Map.of("getId", channel));
        User user = fake(User.class, Map.of("getId", author));
        SelfUser self = fake(SelfUser.class, Map.of("getId", "test-bot"));
        JDA jda = fake(JDA.class, Map.of("getSelfUser", self));
        Message message = fake(Message.class, Map.of("getTextChannel", textChannel, "getContentRaw", content,
            "getAuthor", user, "getGuild", fake(Guild.class, Map.of()),
            "getEmbeds", hasEmbed ? java.util.Collections.singletonList(null) : List.of()));
        return new DiscordGuildMessageSentEvent(jda, message);
    }

    private static void results(Path directory) throws Exception {
        Map<?, ?> alert = recipe(directory, "tournament-results");
        String prefix = "[PFP-PLACEHOLDERS-v1]|";
        String valid = prefix + "Most Fish Caught|_angler_|.bedrock|N/A";
        var event = relay(valid, "private-relay", "test-bot", false);
        check(qualifies(alert, event), "Valid captured winners rejected");
        check(!qualifies(alert, relay(valid, "elsewhere", "test-bot", false)), "Wrong relay channel accepted");
        check(!qualifies(alert, relay(valid, "private-relay", "other-bot", false)), "Wrong author accepted");
        check(!qualifies(alert, relay(valid, "private-relay", "test-bot", true)), "Embed feedback loop allowed");
        for (String content : List.of("ordinary chat", prefix + "Name|one|two", prefix + "Name|one|two|three|four",
                prefix + "Name||two|three", prefix + " |one|two|three", prefix + "Name|one|two| ",
                prefix + "Name|%onemb_pfp_first%|two|three", prefix + "Name|${unsafe}|two|three",
                prefix + "Name|{unsafe}|two|three", prefix + "Name|one;field|two|three", prefix + "Name|one\ntwo|two|three",
                prefix + "Name|one\rtwo|two|three", prefix + "Name|" + "x".repeat(800) + "|two|three")) {
            check(!qualifies(alert, relay(content, "private-relay", "test-bot", false)), "Malformed snapshot accepted: " + content);
        }
        check(description(alert, event, "").contains("`Most Fish Caught` fishing tournament has ended"), "Snapshot tournament name lost");
        Map<?, ?> embed = (Map<?, ?>) alert.get("Embed");
        List<?> fields = (List<?>) embed.get("Fields");
        List<String> expected = List.of("_angler_", ".bedrock", "N/A");
        for (int i = 0; i < 3; i++) {
            String field = NamedValueFormatter.format((String) fields.get(i), EXPRESSIONS,
                expression -> new SpELExpressionBuilder(expression).withVariable("event", event).evaluate(event));
            String[] parts = field.split(";", -1);
            check(parts.length == 3 && parts[1].equals("`" + expected.get(i) + "`") && parts[2].equals("true"), "Podium field corrupted: " + field);
            check(visible(parts[1]).equals(expected.get(i)), "Discord-visible name changed: " + field);
        }
    }

    private static List<Map<?, ?>> resultsAlerts(Path profile) throws Exception {
        Map<?, ?> document = new Yaml(new SafeConstructor()).load(Files.readString(profile));
        List<Map<?, ?>> matches = new ArrayList<>();
        for (Object value : (List<?>) document.get("Alerts")) {
            Map<?, ?> alert = (Map<?, ?>) value;
            if (alert.get("Embed") instanceof Map<?, ?> embed
                    && embed.get("Title") instanceof Map<?, ?> title
                    && "Fishing tournament ended".equals(title.get("Text"))) matches.add(alert);
        }
        check(!matches.isEmpty(), "Profile has no Fishing tournament ended Alert: " + profile);
        return matches;
    }

    private static Map<String, String> winnerPlaceholders(List<String> winners) {
        return Map.of("%onemb_pfp_first%", winners.get(0), "%onemb_pfp_second%", winners.get(1),
            "%onemb_pfp_third%", winners.get(2));
    }

    private static String replayText(String template, Object event, Map<String, String> placeholders) {
        String expressions = NamedValueFormatter.format(template, EXPRESSIONS,
            expression -> new SpELExpressionBuilder(expression).withVariable("event", event).evaluate(event));
        String result = NamedValueFormatter.format(expressions, key -> "{" + key + "}");
        // Explicit static PlaceholderAPI fixture values, not a live provider or scheduler.
        for (var placeholder : placeholders.entrySet()) result = result.replace(placeholder.getKey(), placeholder.getValue());
        check(!result.contains("${") && !result.contains("%onemb_pfp_"), "Unresolved replay output: " + result);
        return result;
    }

    private record Podium(String description, List<String> winners) {}

    private static void replayEvent(List<Map<?, ?>> alerts, Object event, Map<String, String> placeholders,
                                    List<Podium> output) {
        for (Map<?, ?> alert : alerts) {
            if (!qualifies(alert, event)) continue;
            Map<?, ?> embed = (Map<?, ?>) alert.get("Embed");
            List<?> fields = (List<?>) embed.get("Fields");
            check(fields != null && fields.size() == 3, "Expected exactly three podium fields");
            List<String> winners = new ArrayList<>();
            for (Object field : fields) {
                String rendered = replayText((String) field, event, placeholders);
                String[] parts = rendered.split(";", -1);
                check(parts.length == 3 && parts[2].equals("true"), "Replay podium field corrupted: " + rendered);
                winners.add(visible(parts[1]));
            }
            output.add(new Podium(replayText((String) embed.get("Description"), event, placeholders), winners));
        }
    }

    private static void resultsReplay(String source, List<Map<?, ?>> alerts) {
        List<String> fresh = List.of("Fresh_First", "FreshSecond", ".FreshThird");
        Map<String, String> old = winnerPlaceholders(List.of("OLD_First", "OLD_Second", "OLD_Third"));
        for (String scenario : List.of("three", "one", "overwrite", "empty", "cancel")) {
            List<Podium> output = new ArrayList<>();
            // Replay the ordering established by the recorded 4.9.31 runtime investigation:
            // the end event precedes StopCommands; only completed results produce a relay.
            // These real events and formatters do not establish live scheduling behavior.
            replayEvent(alerts, new TournamentEndEvent("Most Fish Caught"), old, output);
            boolean hasResults = !scenario.equals("empty") && !scenario.equals("cancel");
            List<String> expected = scenario.equals("one") ? List.of("Fresh_First", "N/A", "N/A") : fresh;
            if (hasResults) {
                var captured = relay("[PFP-PLACEHOLDERS-v1]|Most Fish Caught|" + String.join("|", expected),
                    "private-relay", "test-bot", false);
                Map<String, String> current = winnerPlaceholders(scenario.equals("overwrite")
                    ? List.of("LATER_TOURNAMENT", "LATER_TOURNAMENT", "LATER_TOURNAMENT") : expected);
                replayEvent(alerts, captured, current, output);
            }
            String context = source + " " + scenario + " replay";
            check(output.size() == (hasResults ? 1 : 0), context + " emitted " + output.size() + " podiums: " + output);
            if (hasResults) {
                Podium podium = output.getFirst();
                check(podium.winners().equals(expected), context + " expected " + expected + " but rendered " + podium.winners());
                check(podium.description().contains("`Most Fish Caught` fishing tournament has ended"),
                    context + " lost the captured tournament name: " + podium.description());
            }
        }
        System.out.println("PASS: " + source + " results replay (three, one, overwrite, empty, cancel)");
    }

    public static void main(String[] args) throws Exception {
        try (JarFile jar = new JarFile(args[0])) {
            Map<?, ?> plugin = new Yaml(new SafeConstructor()).load(jar.getInputStream(jar.getJarEntry("plugin.yml")));
            System.out.println("Inspecting " + plugin.get("name") + " " + plugin.get("version") + " (from plugin.yml)");
        }
        Path directory = Path.of(args[1]);
        Map<?, ?> all = recipe(directory, "custom-fish-catch");
        Map<?, ?> rare = recipe(directory, "rare-fish-catch");
        Map<?, ?> start = recipe(directory, "tournament-start");
        Map<?, ?> end = recipe(directory, "tournament-end");
        Player player = player("_angler_");
        ItemStack named = new FishItem(true, "§bSea_Queen");

        // Reproduce server-thread type visibility; only JDK types are available to T(...).
        Thread.currentThread().setContextClassLoader(ClassLoader.getPlatformClassLoader());
        for (String tier : List.of("Bronze", "Silver", "Gold", "Diamond", "Platinum", "Mythical", "Divine", "mYtHiCaL", "Unknown")) {
            for (boolean hotspot : List.of(false, true)) {
                PyroFishCatchEvent event = new PyroFishCatchEvent(player, tier, 7, hotspot, named);
                check(!event.isAsynchronous(), "Unexpected async legacy catch event");
                check(qualifies(all, event), "Custom catch rejected: " + tier);
                boolean expectedRare = List.of("platinum", "mythical", "divine").contains(tier.toLowerCase(java.util.Locale.ROOT));
                check(qualifies(rare, event) == expectedRare, "Incorrect rare filter for " + tier);
                for (Map<?, ?> alert : expectedRare ? List.of(all, rare) : List.of(all)) {
                    String output = description(alert, event, player.getName());
                    check(output.contains("`_angler_` caught `Sea_Queen`"), "Fish/player formatting: " + output);
                    check(output.contains("**" + (hotspot ? "yes" : "no") + "**"), "Incorrect Hotspot output");
                    check(visible(output).contains("_angler_ caught Sea_Queen"), "Discord-visible names changed");
                }
            }
        }
        for (Map<?, ?> alert : List.of(all, rare)) {
            check(!qualifies(alert, new PyroFishCatchEvent(null, "Mythical", 7, false, named)), "Null player accepted");
            check(!qualifies(alert, new PyroFishCatchEvent(player, null, 7, false, named)), "Null tier accepted");
            check(!qualifies(alert, new PyroFishCatchEvent(player, "", 7, false, named)), "Empty tier accepted");
            for (ItemStack missingName : new ItemStack[]{null, new FishItem(false, null), new FishItem(true, null)}) {
                String output = description(alert, new PyroFishCatchEvent(player, "Mythical", 7, false, missingName), ".bedrock");
                check(output.contains("`.bedrock` caught `fish #7`"), "Fish-number fallback or Bedrock prefix failed");
            }
            String colored = description(alert, new PyroFishCatchEvent(player, "Mythical", 7, false,
                new FishItem(true, "§x§f§f§0§0§a§a&lKing's `Fish`")), player.getName());
            check(colored.contains("`King's Fish`"), "Hex color/backtick formatting: " + colored);
        }
        for (Map<?, ?> alert : List.of(start, end)) {
            boolean isStart = alert == start;
            for (String name : new String[]{null, "", "   ", "§6MOST_FISH"}) {
                Event event = isStart ? new TournamentStartEvent(name) : new TournamentEndEvent(name);
                check(qualifies(alert, event) == (name != null && !name.isBlank()), "Tournament name guard failed");
                check(!qualifies(isStart ? end : start, event), "Tournament routed to the wrong Recipe");
                if (name != null && !name.isBlank()) {
                    String output = description(alert, event, "");
                    check(output.contains("`MOST_FISH` fishing tournament has " + (isStart ? "started" : "ended")), "Tournament output: " + output);
                }
                check(event.getHandlers() == event.getClass().getMethod("getHandlerList").invoke(null), "Invalid handler list");
            }
        }
        results(directory);
        resultsReplay("Staged Recipe", List.of(recipe(directory, "tournament-results")));
        resultsReplay("1MoreBlock Live Profile", resultsAlerts(Path.of(args[2])));
        System.out.println("PASS: " + checks + " API, condition, fallback, Discord formatting, and recorded-order replay checks. No server events or Discord messages were sent; replay does not verify live scheduling.");
    }
}
