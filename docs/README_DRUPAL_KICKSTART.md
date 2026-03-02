# Drupal Kickstart

## Starting a New Project

1. Create and navigate to your project directory:
   ```bash
   mkdir ~/Sites/my-drupal-site && cd ~/Sites/my-drupal-site
   ```

2. Download the latest release and run the setup script:
   ```bash
   curl -L https://github.com/AtenDesignGroup/drupal-kickstart/archive/refs/tags/11.0.0.tar.gz | tar xz --strip-components=1 && bash drupal-kickstart.sh
   ```
   Or visit [Releases](https://github.com/AtenDesignGroup/drupal-kickstart/releases) to download manually.

## Contributing

We welcome contributions! Please submit issues and pull requests on [GitHub](https://github.com/AtenDesignGroup/drupal-kickstart).

### General Development Guidelines
- Limited for use on spinning up new projects
- Branch based on Drupal version and tag releases
    - 11.0.x
        - Tag: 11.0.1 etc.
    - 12.0.x
- Download a release to start the process
- Track issues in Github Issues
- Use recipes heavily to add functionality and features
