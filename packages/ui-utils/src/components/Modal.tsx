import { createElement, useState } from "react";

type ModalProps<T extends Record<string, unknown> = Record<string, never>> = {
  button: React.ComponentProps<"button"> & { text: string };
  Component: (props: T) => React.JSX.Element;
} & (Record<string, never> extends T
  ? { componentProps?: T }
  : { componentProps: T });

type ModalContentProps<T extends Record<string, unknown>> = Omit<
  ModalProps<T>,
  "button"
> & {
  onClose: () => void;
};

function ModalContent<T extends Record<string, unknown>>({
  Component,
  componentProps,
  onClose,
}: ModalContentProps<T>) {
  return (
    <div className="mask" onClick={onClose}>
      <div className="mask--content" onClick={(evt) => evt.stopPropagation()}>
        {createElement(Component, componentProps)}
        <button onClick={onClose} className="mask--close" />
      </div>
    </div>
  );
}

export function Modal<T extends Record<string, unknown>>({
  button,
  ...props
}: ModalProps<T>) {
  const { text, ...buttonProps } = button;
  const [open, setOpen] = useState(false);

  function handleClick(evt: React.MouseEvent<HTMLButtonElement>) {
    if (button?.onClick) {
      button?.onClick(evt);
    }

    setOpen(true);
  }

  return (
    <>
      <button {...buttonProps} onClick={handleClick}>
        {text}
      </button>
      {open && <ModalContent onClose={() => setOpen(false)} {...props} />}
    </>
  );
}
