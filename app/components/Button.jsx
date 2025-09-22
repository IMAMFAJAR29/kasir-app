// components/Button.jsx
export default function Button({
  children,
  as: Tag = "button",
  className = "",
  ...props
}) {
  return (
    <Tag
      {...props}
      className={`bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 inline-flex items-center justify-center ${className}`}
    >
      {children}
    </Tag>
  );
}
