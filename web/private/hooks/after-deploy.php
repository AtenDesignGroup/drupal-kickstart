<?php

$drushCommands = [
  'updb' => [
    '--yes',
  ],
  'cim' => [
    '--yes',
  ],
  'cr' => [],
];

// Iterate over each drush command and execute it on the system.
foreach ($drushCommands as $subCommand => $args) {
  $command = "drush {$subCommand} " . implode(' ', $args);
  echo sprintf('Running %s...', $command);
  passthru($command);
}

echo 'All drush commands have been executed!';

exit(0);
