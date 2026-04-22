/**
 * @file
 * Components - Slider
 * Establishing a working library in order to attach the Splide slider
 * JavaScript library wherever needed. Splide controls, structure and other
 * documentation can be found at https://splidejs.com/guides/getting-started/
 */

((Drupal, once) => {
  /**
   * Applies default Splide configuration.
   */
  const setSplideDefaults = () => {
    /* eslint-disable */
    Splide.defaults = {
      i18n: {
        prev: 'Previous slide',
        next: 'Next slide',
      },
    };
    /* eslint-enable */
  };

  /**
   * Creates and mounts a Splide instance for a slider element.
   *
   * @param {HTMLElement} sliderElement - Slider wrapper to mount.
   * @returns {Splide} Mounted Splide instance.
   */
  const createSplideInstance = (sliderElement) => {
    /* eslint-disable */
    const slideshow = new Splide(sliderElement);
    /* eslint-enable */

    slideshow.mount();
    return slideshow;
  };

  /**
   * Wires autoplay play and pause state to the toggle button.
   *
   * @param {Splide} slideshow - Mounted Splide instance.
   * @param {HTMLElement} toggleButton - Play/pause toggle button.
   * @param {Function} translate - Translation callback.
   */
  const wireAutoplayToggle = (slideshow, toggleButton, translate) => {
    const pausedClass = 'is-paused';

    slideshow.on('autoplay:play', () => {
      toggleButton.classList.remove(pausedClass);
      toggleButton.setAttribute('aria-label', translate('Pause Autoplay'));
    });

    slideshow.on('autoplay:pause', () => {
      toggleButton.classList.add(pausedClass);
      toggleButton.setAttribute('aria-label', translate('Start Autoplay'));
    });
  };

  /**
   * Adds aria-controls wiring for the autoplay toggle button.
   *
   * @param {HTMLElement} sliderElement - Slider wrapper element.
   * @param {HTMLElement} toggleButton - Play/pause toggle button.
   */
  const setToggleAriaControls = (sliderElement, toggleButton) => {
    const track = sliderElement.querySelector('.splide__track');
    const trackId = track?.getAttribute('id');

    if (trackId) {
      toggleButton.setAttribute('aria-controls', trackId);
    }
  };

  /**
   * Initializes all slider properties for a given element.
   *
   * @param {HTMLElement} sliderElement - Slider wrapper element.
   * @param {Function} translate - Translation callback.
   */
  const initializeSlider = (sliderElement, translate) => {
    const slideshow = createSplideInstance(sliderElement);
    const toggleButton = sliderElement.querySelector('.splide__toggle');

    if (toggleButton) {
      wireAutoplayToggle(slideshow, toggleButton, translate);
      setToggleAriaControls(sliderElement, toggleButton);
    }
  };

  /**
   * Defines a Drupal behavior for managing slideshow media elements.
   */
  Drupal.behaviors.slideshowMedia = {
    /**
     * Attaches Splide sliders within the provided Drupal context.
     *
     * @param {HTMLElement} context - Drupal context element.
     */
    attach(context) {
      setSplideDefaults();

      once('slideshowMedia', '.c-slideshow', context).forEach((slider) => {
        if (!slider) {
          return;
        }

        initializeSlider(slider, Drupal.t);
      });
    },
  };
})(Drupal, once);
