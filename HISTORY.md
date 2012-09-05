Selleck History
===============

0.1.15 (2012-09-04)
-------------------

* Log errors to stderr instead of stdout. [Evan Goer]


0.1.14 (2012-08-14)
-------------------

* Fixed a bug in which examples weren't properly cross-linked in server mode.
  [Dav Glass]


0.1.13 (2012-04-19)
-------------------

* Node 0.8.x compatibility.

* Added custom header and footer partials for easier theme overrides. [Dav
  Glass]


0.1.12 (2012-03-02)
-------------------

* Fixed a trailing comma in the Prettify JS.


0.1.11 (2012-03-01)
-------------------

* You can now explicitly specify a language name (like "js" or "handlebars")
  after the opening triple-backticks of a code block to force Prettify to
  treat the block as that language rather than relying on auto-detection.

* Add Handlebars+HTML highlighting support to the version of Prettify
  distributed with Selleck. Prettify can't auto-detect Handlebars, so you need
  to explicitly specify "handlebars" after the opening triple-backticks of a
  code block to enable it.


0.1.10 (2012-01-19)
-------------------

* Sub-pages of component pages may now contain their own examples. [Dav Glass]


0.1.9 (2011-12-12)
------------------

* Fixed a bug in the delimiter-escaping change that caused an exception on
  empty templates.


0.1.8 (2011-12-12)
------------------

* Literal Mustache/Handlebars delimiters can now be output in generated docs by
  escaping them with a backslash: `\{{foo\}}` will output the literal string
  "{{foo}}".


0.1.7 (2011-10-27)
------------------

* Node 0.5.x/0.6.x compatibility.

* Now using graceful-fs to avoid EMFILE errors due to too many open file
  handles when generating lots of docs.

* Default theme now looks a lot more like yuilibrary.com.


0.1.6 (2011-09-27)
------------------

* Fixed a bug that caused the `hasOwnExamples` property to be set to true even
  if a component only had inherited examples.

* Fixed a bug that caused component override metadata to be merged into project
  metadata.

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
