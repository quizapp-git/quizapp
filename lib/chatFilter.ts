import type { SupabaseClient } from "@supabase/supabase-js";

export type ChatFilterAction = "block" | "replace" | "flag";

export type ChatFilterResult = {
  ok: boolean;
  text: string;
  blocked: boolean;
  flagged: boolean;
};

export async function applyChatFilter(
  supabase: SupabaseClient,
  rawText: string
): Promise<ChatFilterResult> {
  const { data: settingsRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "chat_filter")
    .maybeSingle();

  let enabled = true;
  let maxLength = 80;

  if (settingsRow && typeof settingsRow.value === "object" && settingsRow.value) {
    const value = settingsRow.value as any;
    if (typeof value.enabled === "boolean") {
      enabled = value.enabled;
    }
    if (typeof value.max_message_length === "number") {
      maxLength = value.max_message_length;
    } else if (typeof value.max_message_length === "string") {
      const parsed = Number.parseInt(value.max_message_length, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        maxLength = parsed;
      }
    }
  }

  const trimmed = rawText.trim();
  const truncated =
    trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;

  if (!enabled || truncated.length === 0) {
    return {
      ok: true,
      text: truncated,
      blocked: false,
      flagged: false
    };
  }

  const { data: rules } = await supabase
    .from("chat_filter_rules")
    .select("pattern,action,replacement")
    .eq("is_active", true);

  if (!rules || rules.length === 0) {
    return {
      ok: true,
      text: truncated,
      blocked: false,
      flagged: false
    };
  }

  let resultText = truncated;
  let flagged = false;

  for (const rule of rules as any[]) {
    const pattern = typeof rule.pattern === "string" ? rule.pattern : "";
    if (!pattern) {
      continue;
    }

    const action = rule.action as ChatFilterAction;
    const replacement =
      typeof rule.replacement === "string" && rule.replacement.length > 0
        ? rule.replacement
        : "***";

    let regex: RegExp | null = null;
    try {
      regex = new RegExp(pattern, "gi");
    } catch {
      regex = null;
    }

    const hasMatch = regex
      ? regex.test(resultText)
      : resultText.toLowerCase().includes(pattern.toLowerCase());

    if (!hasMatch) {
      continue;
    }

    if (action === "block") {
      return {
        ok: false,
        text: "",
        blocked: true,
        flagged
      };
    }

    if (action === "replace") {
      if (regex) {
        resultText = resultText.replace(regex, replacement);
      } else {
        const lowerPattern = pattern.toLowerCase();
        let output = "";
        let i = 0;
        while (i < resultText.length) {
          const segment = resultText.slice(i, i + lowerPattern.length);
          if (segment.toLowerCase() === lowerPattern) {
            output += replacement;
            i += lowerPattern.length;
          } else {
            output += resultText[i];
            i += 1;
          }
        }
        resultText = output;
      }
      continue;
    }

    if (action === "flag") {
      flagged = true;
    }
  }

  return {
    ok: true,
    text: resultText,
    blocked: false,
    flagged
  };
}

