import 'preact';

declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements {
      'adw-clamp': any;
      'adw-header': any,
      'adw-content': any,
      'adw-icon': any,
      'adw-header': any,
      'adw-view-switcher-bar': any,
      'adw-tab': any,
    }
  }
}
