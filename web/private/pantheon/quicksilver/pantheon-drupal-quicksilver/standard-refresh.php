<?php

/**
 * @file
 * A pantheon quicksilver script to run when code has been pushed to the GIT
 * repository.
 */

$command = "drush deploy --yes";
echo sprintf('Running %s...', $command);
passthru($command);

echo 'Drush deploy command executed!';

exit(0);
