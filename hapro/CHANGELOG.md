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

## v1.0-alpha2 - 14/10/2024

### Added
- S6-overlay is now using v3 architecture for better dependency and service management
- Some functionalities have been readded from the previous state:
    - The http in configuration.yaml is now added automatically again
    - Some hardcoded vars have been replaced with requested vars from the hapro api or the supervisor (subdomain, internal ip, internal port, etc)
- The used addon images are no longer debian but alpine based (officially recommended by home assistant)
