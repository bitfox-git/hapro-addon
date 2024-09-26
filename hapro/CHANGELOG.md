<!-- https://developers.home-assistant.io/docs/add-ons/presentation#keeping-a-changelog -->

## v1.0-alpha1 - 26/09/2024

*A lot of functionality has been removed for this alpha from the previous state, most will be readded in the near future but in a better/cleaner format.*

### Added
- Rathole has been added including:
    - Automatically getting toml
    - Registering device (as pending) when device does not exist yet
    - Opening tunnel with HaPro server
- Caddy has been added including:
    - Dynamic Caddyfile via env vars
    - A reverse proxy to capture hapro api requests and pass the rest to home assistant


