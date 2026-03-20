/**
 * @type { import('@storybook/server-webpack5').StorybookConfig }
 */
const config = {
  stories: [
    `${process.env.DRUPAL_DOCROOT}/themes/custom/**/**/*.stories.mdx`,
    `${process.env.DRUPAL_DOCROOT}/themes/custom/**/**/*.stories.@(json)`,
  ],
  addons: [
    '@storybook/addon-webpack5-compiler-swc',
    '@storybook/addon-links',
    '@storybook/addon-essentials',
  ],
  framework: {
    name: '@storybook/server-webpack5',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};
export default config;
