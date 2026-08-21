((Drupal, once) => {
  Drupal.behaviors.searchBar = {
    attach(context) {
      // Attach behavior once per search toggle button
      once('searchbar', '.c-search-bar__button', context).forEach(
        (searchToggle) => {
          // Mobile media query (shared reference)
          const isMobileQuery = window.matchMedia('(max-width: 1023px)');

          // Find the search content controlled by this toggle
          const searchContent = document.getElementById(
            searchToggle.getAttribute('aria-controls'),
          );

          // Exit early if expected markup is missing
          if (!searchContent) {
            return;
          }

          // Cache DOM elements for performance and readability
          const inputFields = searchContent.querySelectorAll('input');
          const buttonText = searchToggle.querySelector(
            '.c-search-bar__button-text',
          );

          /**
           * Update tabindex for all input fields
           * Used to control keyboard navigation when search is collapsed
           */
          const setInputsTabIndex = (value) => {
            inputFields.forEach((input) => {
              input.setAttribute('tabindex', value);
            });
          };

          /**
           * Close the search when the Escape key is pressed
           * Only active while the search is expanded
           */
          const closeSearch = (event) => {
            if (event.key !== 'Escape' && event.key !== 'Esc') {
              return;
            }

            // Remove keydown listener once search is closed
            context.removeEventListener('keydown', closeSearch, true);

            // Update ARIA state
            searchToggle.setAttribute('aria-expanded', 'false');

            // Hide search content on desktop only
            if (!isMobileQuery.matches) {
              searchContent.setAttribute('aria-hidden', 'true');
            }

            // Remove inputs from tab order
            setInputsTabIndex(-1);

            // Update visible button text
            buttonText.textContent = 'Expand Search';

            // Return focus to the toggle for keyboard users
            searchToggle.focus();
          };

          /**
           * Toggle search expand/collapse state
           */
          const toggleSearch = () => {
            const isExpanded =
              searchToggle.getAttribute('aria-expanded') === 'true';

            // Update ARIA expanded state
            searchToggle.setAttribute('aria-expanded', String(!isExpanded));

            // Toggle visibility on desktop only
            if (!isMobileQuery.matches) {
              searchContent.setAttribute('aria-hidden', String(isExpanded));
            }

            // Update keyboard accessibility
            setInputsTabIndex(isExpanded ? -1 : 0);

            // Update button text
            buttonText.textContent = isExpanded
              ? 'Expand Search'
              : 'Close Search';

            // Listen for Escape key only when expanded
            if (!isExpanded) {
              context.addEventListener('keydown', closeSearch, true);
            }
          };

          // Initial state setup
          // On mobile, search is always visible and tabbable
          if (isMobileQuery.matches) {
            searchContent.setAttribute('aria-hidden', 'false');
            setInputsTabIndex(0);
          } else {
            // On desktop, inputs are initially removed from tab order
            setInputsTabIndex(-1);
          }

          // Toggle search on button click
          searchToggle.addEventListener('click', toggleSearch);
        },
      );
    },
  };
})(Drupal, once);
