import {
  Directive,
  ElementRef,
  EmbeddedViewRef,
  input,
  TemplateRef,
  ViewContainerRef,
  signal,
  WritableSignal,
  computed,
  effect,
  DestroyRef,
  inject,
} from '@angular/core';

@Directive({
  selector: '[libHoverDropdown]',
})
export class HoverDropdown {
  dropdownTemplate = input.required<TemplateRef<any>>({
    alias: 'libHoverDropdown',
  });

  private viewRef: WritableSignal<EmbeddedViewRef<any> | null> = signal(null);
  private timeout: WritableSignal<ReturnType<typeof setTimeout> | null> =
    signal(null);

  private destroyRef = inject(DestroyRef);

  constructor(private el: ElementRef, private viewContainer: ViewContainerRef) {
    const host = el.nativeElement;

    host.addEventListener('mouseenter', () => this.show());
    host.addEventListener('mouseleave', () => this.scheduleHide());

    // Cleanup effect
    effect(
      () => {
        const currentTimeout = this.timeout();
        return () => {
          if (currentTimeout) clearTimeout(currentTimeout);
        };
      },
      { allowSignalWrites: true }
    );

    // Optional: computed property for visibility
    const isVisible = computed(() => this.viewRef() !== null);
  }

  private show() {
    this.clearTimeout();
    if (!this.viewRef()) {
      const newViewRef = this.viewContainer.createEmbeddedView(
        this.dropdownTemplate()
      );
      this.viewRef.set(newViewRef);

      const dropdownEl = newViewRef.rootNodes[0] as HTMLElement;

      dropdownEl.addEventListener('mouseenter', () => this.cancelHide());
      dropdownEl.addEventListener('mouseleave', () => this.scheduleHide());

      // Positioning (optional)
      dropdownEl.style.position = 'absolute';
      dropdownEl.style.zIndex = '9999';
    }
  }

  private scheduleHide() {
    this.timeout.set(
      setTimeout(() => {
        this.hide();
      }, 200)
    );
  }

  private cancelHide() {
    this.clearTimeout();
  }

  private hide() {
    const currentViewRef = this.viewRef();
    if (currentViewRef) {
      currentViewRef.destroy();
      this.viewRef.set(null);
    }
  }

  private clearTimeout() {
    const currentTimeout = this.timeout();
    if (currentTimeout) {
      clearTimeout(currentTimeout);
      this.timeout.set(null);
    }
  }
}
