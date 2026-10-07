import { useEffect, useState } from "react";
import { emptyContext, loadMapContext } from "../data/mapContext";
import type { ResortId } from "../types/resort";
export function useMapContext(id: ResortId) {
  const [context, setContext] = useState(emptyContext);
  useEffect(() => {
    let alive = true;
    setContext(emptyContext);
    loadMapContext(id)
      .then((data) => {
        if (alive) setContext(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [id]);
  return context;
}
