# What the API key can and cannot do

An API key reads account **configuration** and writes **identity tags**:

- channels configured on the workspace (LINE, Facebook, Instagram, web
  widget, marketplaces), with ids and active state;
- the LINE rich-menu layout catalog;
- the chat-label taxonomy used to segment contacts;
- mapping a LINE or Facebook user to your own customer id and attaching
  system tags (`chatcone_verify_tag`, which requires a channel key).

It cannot read the live inbox. The endpoints for contact lists and message
transcripts (followers, messages) reject the long-lived key; they require an
interactive agent session token. So past conversations are not reachable
through these tools — they come from a portal export — and new messages reach
you only through Chatcone's outbound webhook, configured in the Chatcone
portal.

Plan integrations accordingly: use the tools to read how a workspace is set
up and to keep contact identity in sync with your own systems; treat message
history as something you export, not query.
