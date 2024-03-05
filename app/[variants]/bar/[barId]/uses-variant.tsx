import { colorVariant as __colorVariant } from "@/app/variants";

export async function ShowColorVariant() {
  const color = await __colorVariant();
  return (
    <div style={{ display: "flex", gap: "0.5ch", alignItems: "center" }}>
      <div style={{ lineHeight: 1.5 }}>Active color: </div>
      <span
        style={{
          display: "inline-block",
          backgroundColor: color,
          width: "0.8em",
          height: "0.8em",
        }}
      ></span>
    </div>
  );
}
