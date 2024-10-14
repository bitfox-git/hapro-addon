# Home Assistant Add-on: HAPRO


![Supports aarch64 Architecture][aarch64-shield]
![Supports amd64 Architecture][amd64-shield]

<!-- ![Supports armhf Architecture][armhf-shield] -->
<!-- ![Supports armv7 Architecture][armv7-shield] -->
<!-- ![Supports i386 Architecture][i386-shield] -->

## TODO for refactor:
- [x] Recreate Rathole handling
- [x] Transfer to new api
- [ ] Recreate the internal api handling
- [ ] Recreate the hass auth header
- [ ] Move creating of (rathole) images to bitfox


HAPRO extends the capabilities of your Home Assistant installation by providing an easy-to-use interface for creating public URLs, managing cloud backups, and handling multiple homes seamlessly.

## Features

### Public URL Creation

- **Secure Access Anywhere**: Generate secure, public URLs for your Home Assistant setup, allowing you to access your smart home from anywhere in the world.
- **Automatic SSL Management**: HAPRO handles SSL certificate generation and renewal to ensure your connections are always secure.

### Cloud Backups

- **Scheduled Backups**: Configure automatic backups on a daily, weekly, or monthly basis.
- **Offsite Storage**: Safeguard your configurations and data by storing backups in the cloud, protecting against local hardware failures.

### Multi-Home Management

- **Unified Dashboard**: Manage multiple Home Assistant installations from a single dashboard.
- **Custom Configurations**: Tailor settings for each home while maintaining overall control from one account.

## Getting Started

### Prerequisites

- Home Assistant installed and running on your local network.
- An active internet connection for setting up public URLs and cloud backups.

### Installation

1. Add the repository to your home assistant addons
2. Install the addon

### Configuration

-  Create a home on the dashboard
-  Copy the token
-  Insert the token into the config of hapra addon
-  Done!

## Usage

- Open the url and login

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## License

See `LICENSE` for more information.

## Support

For support, email email@placeholder.com or open an issue on the GitHub project page.


[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg
