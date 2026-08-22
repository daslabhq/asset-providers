# Connecting a Chatcone workspace

Chatcone authenticates with a static key pair, not OAuth. You need two
values, and an optional third:

- **API Key** — in Chatcone, open Settings → API and copy the Open API key.
  One key drives both Chatcone surfaces described below.
- **Company ID** — your workspace id. It travels as the `company_id` header
  on platform calls.
- **Channel Key** (optional) — the key of the channel you want to tag
  contacts on, typically your LINE OA channel. Without it the three read
  tools still work; the contact-tagging write does not.

## The two surfaces behind the tools

**Open API v3** (`open-api.chatcone.com/v3`) is the officially supported,
stable surface. It authenticates with two headers, `api_key` and
`channel_key`, and its scope is deliberately narrow: identity verification
and contact tagging, plus outbound event webhooks. `chatcone_verify_tag` is
the one write here.

**Platform API v2** (`api-v2.chatcone.com/api`) is the API the Chatcone web
app itself calls. It authenticates with `authorization: Bearer <api key>`
plus the `company_id` header. With a long-lived key it reads account
configuration — channels, rich-menu layouts, chat labels — which is what
the three list tools do.

A good first call after connecting is `chatcone_list_channels`: it confirms
the key and company id resolve to the workspace you expect.
