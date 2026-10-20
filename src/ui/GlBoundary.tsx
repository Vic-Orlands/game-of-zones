import { Component, type ReactNode } from "react";

/**
 * If the browser refuses a WebGL context (hardware acceleration off, or the GPU blocked for this page after a
 * crash), say so plainly instead of leaving a blank sheet.
 */
export class GlBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="gl-error" role="alert">
        <h2>The map needs 3D graphics</h2>
        <p>
          Your browser didn't hand this page a WebGL context. That usually means
          hardware acceleration is switched off, or the browser paused 3D for
          this tab after the graphics card stalled.
        </p>
        <p>
          Close other heavy tabs, check that hardware acceleration is on, then
          reload.
        </p>
        <button onClick={() => location.reload()} data-hot>
          Reload
        </button>
      </div>
    );
  }
}
