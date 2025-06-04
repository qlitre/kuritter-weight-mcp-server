import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export class MyMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "kuritter weight management application",
    version: "0.0.1",
  });

  async init() {
    this.server.tool(
      "getRecentWeight",
      "Get kuri_tter recent weight",
      {},
      async () => {
        const result = await this.env.DB.prepare(
          "SELECT * FROM DailyWeights ORDER BY date DESC Limit 7"
        ).all();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      }
    );
    this.server.tool(
      "getMonthlyAverageWeight",
      "Get average weight for each month",
      {
        months: z.number().int().positive().max(60).optional(),
      },
      async ({ months }) => {
        const sql = `
          SELECT
            strftime('%Y-%m', date) AS month,
            ROUND(AVG(weight), 1)    AS avg_weight
          FROM DailyWeights
          GROUP BY month
          ORDER BY month DESC
          ${months ? "LIMIT ?" : ""}
        `;
        const { results } = await this.env.DB.prepare(sql)
          .bind(...(months ? [months] : []))
          .all();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results),
            },
          ],
        };
      }
    );
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
};
