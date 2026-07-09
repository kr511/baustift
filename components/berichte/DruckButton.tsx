"use client";

export function DruckButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary print:hidden"
    >
      Drucken / Als PDF speichern
    </button>
  );
}
