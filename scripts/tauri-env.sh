# Environment for building the Tauri shell on the Linux reference machine
# when webkit2gtk-4.1 is installed in the user-local sysroot instead of the
# system prefix (no sudo available). Source this before cargo/tauri builds:
#   source scripts/tauri-env.sh
SYSROOT="$HOME/.local/opt/tauri-sysroot"
if [ -d "$SYSROOT/usr/lib/pkgconfig" ]; then
  export PKG_CONFIG_PATH="$SYSROOT/usr/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
  export LD_LIBRARY_PATH="$SYSROOT/usr/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  # WebKitGTK resolves helper processes from a build-time path; point it at the sysroot.
  export WEBKIT_EXEC_PATH="$SYSROOT/usr/lib/webkit2gtk-4.1"
  # WebKitGTK's audio stack is GStreamer; the sysroot carries its own plugin set.
  export GST_PLUGIN_PATH="$SYSROOT/usr/lib/gstreamer-1.0${GST_PLUGIN_PATH:+:$GST_PLUGIN_PATH}"
fi
