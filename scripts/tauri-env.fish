# Fish equivalent of scripts/tauri-env.sh — the POSIX script cannot be
# sourced by fish ("Unsupported use of '='"), and the packaged binary will
# not start without these paths because webkit2gtk-4.1 lives in the
# user-local sysroot on the Linux reference machine, not the system prefix.
#
#   source scripts/tauri-env.fish
#
# Keep this in step with scripts/tauri-env.sh (same sysroot, same variables).
set -l sysroot "$HOME/.local/opt/tauri-sysroot"

if test -d "$sysroot/usr/lib/pkgconfig"
  set -gx PKG_CONFIG_PATH "$sysroot/usr/lib/pkgconfig" $PKG_CONFIG_PATH
  set -gx LD_LIBRARY_PATH "$sysroot/usr/lib" $LD_LIBRARY_PATH
  # WebKitGTK resolves helper processes from a build-time path.
  set -gx WEBKIT_EXEC_PATH "$sysroot/usr/lib/webkit2gtk-4.1"
  # WebKitGTK's audio stack is GStreamer; the sysroot carries its own plugins.
  set -gx GST_PLUGIN_PATH "$sysroot/usr/lib/gstreamer-1.0" $GST_PLUGIN_PATH
end
