# Pantheon Secrets Management

You will need to install the Terminus Secrets Manager Plugin if you haven't already:

`terminus self:plugin:install terminus-secrets-manager-plugin`

## Adding secrets locally

1. `terminus secret:site:local-generate <SITE_NAME> --filepath=private/pantheon_secrets/secrets.json`
2. Check 1PW for secret values and update the secrets.json file accordingly.
3. `ddev restart`

## Adding new secrets to Pantheon / Locally

1. `terminus secret:set <SITE_NAME> --scope=web --type=runtime secret_name secret_value`
2. `terminus secret:site:local-generate <SITE_NAME> --filepath=private/pantheon_secrets/secrets.json`
3. Visit admin/config/system/keys/pantheon and Sync Keys or use drush.
4. Note: you will need to replace key values in the secrets.json file with the actual secret values from Pantheon after generating the local secrets file.
5. `ddev restart`



