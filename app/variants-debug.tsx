import { getVariants } from "@/app/lib/variants";
import { ResetVariants } from "./reset-variants";

export async function VariantsDebug() {
  // if (process.env.NODE_ENV !== "development") {
  //   return null;
  // }
  return (
    <div>
      <div
        style={{
          border: "1px solid lightgrey",
          padding: "8px",
          borderRadius: "8px",
          fontFamily: "monospace",
          whiteSpace: "pre",
          display: "inline-flex",
          // flex: "0 1 auto",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <small style={{ display: "block", color: "grey" }}>variants</small>
        {Object.entries(await getVariants()).map(([id, value], i, arr) => (
          <div key={id}>
            {id}: {value}
            {i !== arr.length - 1 && ","}
          </div>
        ))}
        <ResetVariants />
      </div>
    </div>
  );
}
