/**
 * @file
 * Provides Accessible Accordion functionality.
 * Functionality for an Accordion or group of Accordions using accessible methods
 * as described by WCAG: https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
 */

import { A11yAccordion } from '@stierpm/a11y-components';

((Drupal, once) => {
  Drupal.behaviors.dk_start_themeAccordion = {
    attach(context) {
      const accordions = once(
        'dk_start_theme-accordion',
        context.querySelectorAll('.c-accordion'),
      );

      accordions.forEach((accordion) => {
        new A11yAccordion(accordion, {
          triggerSelector: '.c-accordion__trigger[aria-controls]',
          contentSelector: '.c-accordion__content',
          expandedClass: 'is-open',
        });
      });
    },
  };
})(Drupal, once);
