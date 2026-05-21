[app]
title = QuenyaChecker
package.name = quenyachecker
package.domain = org.quenya
source.dir = .
source.include_exts = py
source.include_patterns = vocab_data.py
version = 1.0.0
requirements = python3,kivy
orientation = portrait
fullscreen = 0
android.permissions =
android.api = 33
android.minapi = 21
android.ndk = 25b
android.accept_sdk_license = True
android.arch = arm64-v8a

# Entry point
android.entrypoint = org.kivy.android.PythonActivity
p4a.branch = master

# Icon (optional, uses default if not set)
# icon.filename = %(source.dir)s/icon.png

[buildozer]
log_level = 2
warn_on_root = 1
