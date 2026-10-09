"use client";

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

export default function PermissionsGrid({
  value,
  onChange,
}: PermissionsGridProps) {
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

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[570px] text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>
            <th className="px-3 py-2.5 font-semibold">Modul</th>
            {permissionActions.map(({ key, label }) => (
              <th key={key} className="px-3 py-2.5 text-center font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {permissionModules.map(({ key, label }) => (
            <tr key={key}>
              <th className="px-3 py-2.5 font-medium text-slate-700">
                {label}
              </th>
              {permissionActions.map(({ key: action }) => (
                <td key={action} className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={value[key]?.[action] === true}
                    onChange={(event) =>
                      setPermission(key, action, event.target.checked)
                    }
                    aria-label={`${label}: ${action}`}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
