<?php

/**
 * @file
 * Functions to support dk_start_theme theme settings.
 */

use Drupal\Core\Extension\ThemeSettingsProvider;
use Drupal\Core\Form\FormStateInterface;

/**
 * Implements hook_form_FORM_ID_alter() for system_theme_settings.
 */
function dk_start_theme_form_system_theme_settings_alter(&$form, FormStateInterface $form_state) {
  /** @var \Drupal\Core\Extension\ThemeSettingsProvider $provider */
  $provider = \Drupal::service(ThemeSettingsProvider::class);

  $form['dk_start_theme_settings'] = [
    '#type' => 'details',
    '#title' => t('Settings'),
    '#open' => TRUE,
    '#weight' => -10,
  ];
  $form['dk_start_theme_settings']['display_back_to_top'] = [
    '#type' => 'checkbox',
    '#title' => t('Enable back to top button'),
    '#default_value' => $provider->getSetting('display_back_to_top'),
    '#description' => t('Display a back to top button on the site.'),
  ];

  // Add mobile menu slide direction option.
  $form['dk_start_theme_settings']['mobile_menu_slide_direction'] = [
    '#type' => 'select',
    '#title' => t('Mobile Menu Slide Direction'),
    '#default_value' => $provider->getSetting('mobile_menu_slide_direction'),
    '#options' => [
      'mobile-menu-slideout-right' => t('Slide from Right'),
      'mobile-menu-slideout-left' => t('Slide from Left'),
      'mobile-menu-slideout-top' => t('Slide from Top'),
      'mobile-menu-slideout-bottom' => t('Slide from Bottom'),
    ],
    '#description' => t('Select the direction from which the mobile menu will display.'),
  ];
}
