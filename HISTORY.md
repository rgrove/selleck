Selleck History
===============

0.1.6 (git)
-----------

* Fixed a bug that caused the hasOwnExamples property to be set to true even if
  a component only had inherited examples.


0.1.5 (2011-07-29)
------------------

* All metadata is now parsed before assets are copied and pages are generated.
* Shared examples are now displayed in the example list for all components
  listed in the example's "modules" array.
* Combined metadata output now includes fully-merged component metadata instead
  of the partially-merged metadata that was included before.
* Views for non-component and non-example pages now have a boolean `page`
  property that's set to `true` (examples similarly have an `example` property).
* Added a --dump-views option that causes view data to be written to a .json
  file alongside each generated page.
* Fixed a bug that prevented symlinked input directories from being recognized.


0.1.4 (2011-06-28)
------------------

* Changed the default doc output directory name to "build_docs", since "docs"
  tended to result in people accidentally overwriting their source assets when
  they ran Selleck from the wrong directory.
* Updated to latest upstream Handlebars.js from git, which now includes all
  the bug fixes that were in Selleck's customized Handlebars build.
* Updated Express dependency range to allow 2.4.x.


0.1.3 (2011-04-29)
------------------

* Replaced Mustache.js with Handlebars.js.
* npm 1.0 compatibility (I hope).


0.1.2 (2011-04-28)
------------------

* Project pages are no longer merged into components.
* Page title format tweaks.


0.1.1 (2011-03-11)
------------------

* Updated Express dependency to 2.0.0.
* Override metadata is now merged into global metadata output.
* Server mode now throws errors for easier debugging. [Dav Glass]


0.1.0 (2011-03-08)
------------------

* Initial release.
