import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TimeInputProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export function TimeInput({ label, value, onChange, className }: TimeInputProps) {
  // Convert date to hours and minutes
  const hours = value.getHours().toString().padStart(2, "0");
  const minutes = value.getMinutes().toString().padStart(2, "0");

  // Handle the time input change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    if (!newTime) return;

    const [newHours, newMinutes] = newTime.split(":").map(Number);
    
    // Create a new date with the updated time
    const newDate = new Date(value);
    if (!isNaN(newHours) && !isNaN(newMinutes)) {
      newDate.setHours(newHours);
      newDate.setMinutes(newMinutes);
      onChange(newDate);
    }
  };

  return (
    <div className={className}>
      <Label className="text-sm">{label}</Label>
      <Input
        type="time"
        value={`${hours}:${minutes}`}
        onChange={handleTimeChange}
        className="mt-1"
      />
    </div>
  );
}