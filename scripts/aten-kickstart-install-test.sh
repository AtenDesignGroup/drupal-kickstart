#!/bin/bash

echo "Installing Aten Kickstart..."

composer create-project \
  --stability=dev \
  --no-cache \
  --repository='{"type": "path","url": "./", "options": { "symlink": false}}' \
  atendesigngroup/drupal-kickstart ~/Desktop/ak-test

echo "Finished install."
