"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  permissionActions,
  permissionModules,
  type PermissionAction,
  type PermissionModule,
  type UserPermissions,
} from "@/lib/permissions";

interface PermissionsGridProps {
  value: UserPermissions;
  onChange: (permissions: UserPermissions) => void;
}

/**
 * Hak akses dikelompokkan per modul.
 * Setiap kartu modul punya checkbox "pilih semua", expand/collapse, dan
 * checkbox tindakan spesifik di dalamnya.
 */
export default function PermissionsGrid({
  value,
  onChange,
}: PermissionsGridProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(permissionModules.map((module) => [module.key, true]))
  );

  const setPermission = (
    module: PermissionModule,
    action: PermissionAction,
    checked: boolean
  ) => {
    onChange({
      ...value,
      [module]: {
        ...value[module],
        [action]: checked,
      },
    });
  };

  const moduleState = (module: PermissionModule) => {
    const total = permissionActions.length;
    const checked = permissionActions.filter(
      (action) => value[module]?.[action.key] === true
    ).length;
    return {
      total,
      checked,
      all: checked === total,
      some: checked > 0 && checked < total,
    };
  };

  const toggleModule = (module: PermissionModule) => {
    const { all } = moduleState(module);
    const next: UserPermissions = {
      ...value,
      [module]: { ...value[module] },
    };
    for (const action of permissionActions) {
      next[module]![action.key] = !all;
    }
    onChange(next);
  };

  const allExpanded = permissionModules.every(
    (module) => expanded[module.key]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Centang tindakan per modul. Checkbox modul memilih semua tindakan.
        </p>
        <button
          type="button"
          onClick={() =>
            setExpanded(
              Object.fromEntries(
                permissionModules.map((module) => [module.key, !allExpanded])
              )
            )
          }
          className="text-xs font-semibold text-blue-700 hover:underline"
        >
          {allExpanded ? "Tutup semua modul" : "Buka semua modul"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {permissionModules.map((module) => {
          const state = moduleState(module.key);
          const isOpen = expanded[module.key] === true;

          return (
            <div
              key={module.key}
              className={`rounded-xl border bg-white transition ${
                state.checked > 0
                  ? "border-blue-200 shadow-sm"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={state.all}
                  onChange={() => toggleModule(module.key)}
                  aria-label={`Pilih semua tindakan modul ${module.label}`}
                  ref={(element) => {
                    if (element) element.indeterminate = state.some;
                  }}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((current) => ({
                      ...current,
                      [module.key]: !current[module.key],
                    }))
                  }
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                >
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {module.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold ${
                        state.checked > 0 ? "text-blue-600" : "text-slate-400"
                      }`}
                    >
                      {state.checked}/{state.total}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </span>
                </button>
              </div>

              {isOpen && (
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-3 py-2.5">
                  {permissionActions.map((action) => {
                    const inputId = `${module.key}-${action.key}`;
                    const checked = value[module.key]?.[action.key] === true;
                    return (
                      <label
                        key={action.key}
                        htmlFor={inputId}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition ${
                          checked
                            ? "bg-blue-50 text-blue-800"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setPermission(
                              module.key,
                              action.key,
                              event.target.checked
                            )
                          }
                          className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{action.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
