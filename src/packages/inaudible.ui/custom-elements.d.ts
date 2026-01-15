import 'preact';

declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements {
      'inaudible-audiobook': any;
      'audiobookshelf-player': any;
    }
  }
}