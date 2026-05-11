import {
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  type Placement,
} from "@floating-ui/dom";

interface FloatingPopoverOptions {
  triggerSelector: string;
  panelSelector: string;
  arrowSelector?: string;
  floatingRootSelector?: string;
  placement?: Placement;
  offset?: number;
  padding?: number;
  hideDelay?: number;
}

export const setupFloatingPopover = (
  root: ParentNode,
  {
    triggerSelector,
    panelSelector,
    arrowSelector,
    floatingRootSelector,
    placement = "bottom",
    offset: offsetValue = 10,
    padding = 16,
    hideDelay = 100,
  }: FloatingPopoverOptions,
) => {
  const controller = new AbortController();
  const { signal } = controller;
  const trigger = root.querySelector<HTMLElement>(triggerSelector);
  const panel = root.querySelector<HTMLElement>(panelSelector);
  const arrowElement = arrowSelector
    ? panel?.querySelector<HTMLElement>(arrowSelector)
    : undefined;

  if (!trigger || !panel) {
    return () => controller.abort();
  }

  const originalParent = panel.parentNode;
  const originalNextSibling = panel.nextSibling;
  const floatingRoot = floatingRootSelector
    ? root.querySelector(floatingRootSelector)
    : undefined;

  floatingRoot?.appendChild(panel);

  let hideTimer: number | undefined;
  let cleanupAutoUpdate: (() => void) | undefined;

  const updatePanelPosition = () => {
    void computePosition(trigger, panel, {
      placement,
      strategy: "fixed",
      middleware: [
        offset(offsetValue),
        flip({ padding }),
        shift({ padding }),
        ...(arrowElement ? [arrow({ element: arrowElement, padding })] : []),
      ],
    }).then(({ middlewareData, placement: computedPlacement, x, y }) => {
      Object.assign(panel.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
      panel.dataset.placement = computedPlacement;

      if (!arrowElement) {
        return;
      }

      const { x: arrowX, y: arrowY } = middlewareData.arrow ?? {};
      const staticSide = {
        bottom: "top",
        left: "right",
        right: "left",
        top: "bottom",
      }[computedPlacement.split("-")[0]];

      Object.assign(arrowElement.style, {
        bottom: "",
        left: arrowX != null ? `${arrowX}px` : "",
        right: "",
        top: arrowY != null ? `${arrowY}px` : "",
        [staticSide]: "-6px",
      });
    });
  };

  const showPanel = () => {
    if (hideTimer !== undefined) {
      window.clearTimeout(hideTimer);
      hideTimer = undefined;
    }
    panel.setAttribute("data-open", "true");
    cleanupAutoUpdate ??= autoUpdate(trigger, panel, updatePanelPosition);
    updatePanelPosition();
  };

  const hidePanel = () => {
    hideTimer = window.setTimeout(() => {
      panel.removeAttribute("data-open");
      cleanupAutoUpdate?.();
      cleanupAutoUpdate = undefined;
    }, hideDelay);
  };

  trigger.addEventListener("mouseenter", showPanel, { signal });
  trigger.addEventListener("focus", showPanel, { signal });
  trigger.addEventListener("mouseleave", hidePanel, { signal });
  trigger.addEventListener("blur", hidePanel, { signal });
  panel.addEventListener("mouseenter", showPanel, { signal });
  panel.addEventListener("mouseleave", hidePanel, { signal });
  signal.addEventListener("abort", () => {
    if (hideTimer !== undefined) {
      window.clearTimeout(hideTimer);
      hideTimer = undefined;
    }
    panel.removeAttribute("data-open");
    cleanupAutoUpdate?.();
    cleanupAutoUpdate = undefined;
    if (originalParent && panel.parentNode !== originalParent) {
      if (originalNextSibling?.parentNode === originalParent) {
        originalParent.insertBefore(panel, originalNextSibling);
      } else {
        originalParent.appendChild(panel);
      }
    }
  });

  return () => controller.abort();
};
