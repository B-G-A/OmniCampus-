import React, { createContext, useState } from "react";
import slugify from "../utils/slugify";

// context holds materials keyed by slug
const SubjectContext = createContext({
  materials: {},
  addMaterial: () => {},
});

export function SubjectProvider({ children }) {
  // initialize from localStorage if present
  const [materials, setMaterials] = useState(() => {
    try {
      const stored = localStorage.getItem("materials");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn("failed to parse stored materials", e);
      return {};
    }
  });

  const save = (updater) => {
    setMaterials((prev) => {
      const newMaterials =
        typeof updater === "function" ? updater(prev) : updater;
      try {
        localStorage.setItem("materials", JSON.stringify(newMaterials));
      } catch {}
      return newMaterials;
    });
  };

  const addMaterial = (subjectName, file) => {
    const slug = slugify(subjectName);
    save((prev) => {
      const existing = prev[slug] || [];
      return {
        ...prev,
        [slug]: [...existing, { name: file.name, url: URL.createObjectURL(file) }],
      };
    });
  };

  return (
    <SubjectContext.Provider value={{ materials, addMaterial }}>
      {children}
    </SubjectContext.Provider>
  );
}

export default SubjectContext;