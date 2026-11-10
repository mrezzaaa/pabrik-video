import http from "node:http";

/**
 * Server tiruan yang menyerupai endpoint OpenAI chat.completions, dipakai
 * self-test supaya engine bisa dites tanpa OmniRoute.
 */
export type MockHandler = (input: { system: string; user: string }) => string | Promise<string>;

export async function startMockLlm(handler: MockHandler) {
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        const messages: { role: string; content: string }[] = body.messages ?? [];
        const system = messages.find((m) => m.role === "system")?.content ?? "";
        const user = messages.find((m) => m.role === "user")?.content ?? "";
        const content = await handler({ system, user });
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            id: "mock",
            object: "chat.completion",
            created: 0,
            model: body.model ?? "mock",
            choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
          }),
        );
      } catch (error) {
        res.statusCode = 500;
        res.end(String(error));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
