/**
 * @file
 * Components - Tabs Content
 */

import { A11yTabContent } from '@stierpm/a11y-components';

((Drupal, once) => {
  Drupal.behaviors.dk_start_themeTabsContent = {
    attach(context) {
      const tabs = once(
        'dk_start_theme-tabs-content',
        context.querySelectorAll('.c-tabs-content'),
      );

      tabs.forEach((tab) => {
        A11yTabContent(tab, {
          navigationSelector: '.c-tabs-content__navigation',
          groupSelector: '.c-tabs-content__group',
          triggerSelector: '.c-tabs-content__trigger',
          breakpoint: 768,
        });
      });
    },
  };
})(Drupal, once);
