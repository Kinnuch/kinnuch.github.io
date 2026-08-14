source "https://rubygems.org"

# Jekyll 3.10.0 is exactly the version GitHub Pages runs (see
# https://pages.github.com/versions/), so local output matches production.
#
# We deliberately do NOT use the `github-pages` gem. It exists to pin the whole
# whitelisted-plugin set, and this site uses zero plugins on purpose — the
# sitemap, Atom feed and search index are all hand-written Liquid so they work
# on stock GitHub Pages. Pulling in `github-pages` drags along jekyll-mentions
# -> html-pipeline -> nokogiri, and on 32-bit Windows there is no precompiled
# nokogiri, so it tries to build vendored libiconv from a GNU mirror and dies
# on a network timeout. Nothing here needs it.
#
# If you ever DO add a plugin, swap the three gems below for:
#   gem "github-pages", group: :jekyll_plugins
gem "jekyll", "~> 3.10.0"
gem "kramdown-parser-gfm", "~> 1.1"

# Ruby 3+ no longer bundles webrick, which `jekyll serve` needs.
gem "webrick", "~> 1.8"

# Windows and JRuby do not ship zoneinfo files; tzinfo-data supplies them so
# `timezone: China/Beijing` in _config.yml resolves.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Native directory watching on Windows, for `jekyll serve --livereload`.
gem "wdm", "~> 0.1", platforms: [:mingw, :x64_mingw, :mswin]

# Ruby 3.4 dropped these from the default gems; jekyll still expects them.
gem "csv"
gem "base64"
gem "bigdecimal"
gem "logger"
