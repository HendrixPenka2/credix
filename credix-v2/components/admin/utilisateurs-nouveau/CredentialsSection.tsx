"use client";

import { useState } from "react";
import { Controller, UseFormReturn } from "react-hook-form";
import { Card, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { RoleCard } from "@/components/shared/RoleCard";
import type { Role } from "@/lib/types";
import type { UserFormValues } from "./UserFormSchema";

const ROLES: Role[] = ["AGENT", "SUPERVISEUR", "ADMIN"];

export function CredentialsSection({ form }: { form: UseFormReturn<UserFormValues> }) {
  const { register, control, formState } = form;
  const errors = formState.errors;
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Card className="p-card-padding">
      <CardTitle className="mb-4">Compte & accès</CardTitle>

      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            {ROLES.map((role) => (
              <RoleCard key={role} role={role} selected={field.value === role} onSelect={() => field.onChange(role)} />
            ))}
          </div>
        )}
      />

      <div className="grid md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <Label required>Identifiant</Label>
          <Input icon={<Icon name="alternate_email" size={18} />} {...register("username")} error={!!errors.username} />
        </div>
        <div>
          <Label required>Mot de passe</Label>
          <Input
            type={showPassword ? "text" : "password"}
            icon={<Icon name="key" size={18} />}
            trailing={
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="pointer-events-auto">
                <Icon name={showPassword ? "visibility_off" : "visibility"} size={18} />
              </button>
            }
            {...register("password")}
            error={!!errors.password}
          />
        </div>
        <div>
          <Label required>Confirmer le mot de passe</Label>
          <Input type={showPassword ? "text" : "password"} {...register("confirmPassword")} error={!!errors.confirmPassword} />
          {errors.confirmPassword && <p className="font-body-sm text-danger-rose mt-1">{errors.confirmPassword.message}</p>}
        </div>
      </div>
    </Card>
  );
}
