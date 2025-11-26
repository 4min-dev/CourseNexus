import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import * as Icons from "lucide-react";

// Common Lucide icons for selection
const COMMON_ICONS = [
  "ShoppingBag", "BookOpen", "Gift", "Trophy", "Star", "Users",
  "Sparkles", "Crown", "RefreshCcw", "Zap", "Check", "TrendingUp",
  "Award", "Wallet", "GraduationCap", "Video", "Heart", "Shield",
  "Lock", "Unlock", "Download", "Upload", "Search", "Settings",
  "Bell", "Mail", "Phone", "Calendar", "Clock", "MapPin",
  "Home", "Building", "Store", "Package", "Truck", "CreditCard"
];

export interface EditFieldDescriptor {
  fieldPath: string[];
  label: string;
  type: 'text' | 'textarea' | 'number' | 'url' | 'array' | 'object' | 'icon';
  value: any;
  placeholder?: string;
  objectFields?: { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'url' }[];
  defaultArrayItem?: any; // Default value for new array items
}

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  descriptor: EditFieldDescriptor | null;
  onSave: (fieldPath: string[], value: any) => void;
}

export function EditDialog({ isOpen, onClose, descriptor, onSave }: EditDialogProps) {
  const [editValue, setEditValue] = useState<any>(null);

  useEffect(() => {
    if (isOpen && descriptor) {
      setEditValue(descriptor.value);
    }
  }, [isOpen, descriptor]);

  if (!descriptor) return null;

  const handleSave = () => {
    onSave(descriptor.fieldPath, editValue);
    onClose();
  };

  const handleCancel = () => {
    setEditValue(descriptor.value);
    onClose();
  };

  const renderEditor = () => {
    switch (descriptor.type) {
      case 'text':
      case 'url':
        return (
          <div className="space-y-2">
            <Label htmlFor="edit-input">{descriptor.label}</Label>
            <Input
              id="edit-input"
              type={descriptor.type === 'url' ? 'url' : 'text'}
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={descriptor.placeholder}
              data-testid="input-edit-field"
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor="edit-textarea">{descriptor.label}</Label>
            <Textarea
              id="edit-textarea"
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={descriptor.placeholder}
              rows={4}
              data-testid="textarea-edit-field"
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor="edit-number">{descriptor.label}</Label>
            <Input
              id="edit-number"
              type="number"
              value={editValue || 0}
              onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
              placeholder={descriptor.placeholder}
              data-testid="input-edit-number"
            />
          </div>
        );

      case 'icon':
        const IconPreview = editValue && (Icons as any)[editValue] ? (Icons as any)[editValue] : Icons.ShoppingBag;
        return (
          <div className="space-y-4">
            <Label htmlFor="edit-icon">{descriptor.label}</Label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <IconPreview className="h-8 w-8 text-primary" />
              </div>
              <Select
                value={editValue || 'ShoppingBag'}
                onValueChange={(value) => setEditValue(value)}
              >
                <SelectTrigger className="flex-1" data-testid="select-icon">
                  <SelectValue placeholder="Выберите иконку" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COMMON_ICONS.map((iconName) => {
                    const IconComp = (Icons as any)[iconName];
                    return (
                      <SelectItem key={iconName} value={iconName}>
                        <div className="flex items-center gap-2">
                          {IconComp && <IconComp className="h-4 w-4" />}
                          <span>{iconName}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'array':
        const arrayValue = Array.isArray(editValue) ? editValue : [];
        const isObjectArray = arrayValue.length > 0 && typeof arrayValue[0] === 'object' && arrayValue[0] !== null;
        
        return (
          <div className="space-y-4">
            <Label>{descriptor.label}</Label>
            <div className="space-y-3">
              {arrayValue.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {isObjectArray ? (
                    <div className="flex-1 p-3 rounded-md border bg-muted/30">
                      <div className="text-sm font-medium mb-1">
                        {Object.entries(item).map(([key, val]) => (
                          <div key={key} className="truncate">
                            <span className="text-muted-foreground">{key}:</span> {String(val).slice(0, 50)}{String(val).length > 50 ? '...' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Input
                      value={item}
                      onChange={(e) => {
                        const newArray = [...arrayValue];
                        newArray[index] = e.target.value;
                        setEditValue(newArray);
                      }}
                      placeholder={`${descriptor.label} ${index + 1}`}
                      data-testid={`input-array-${index}`}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newArray = arrayValue.filter((_, i) => i !== index);
                      setEditValue(newArray);
                    }}
                    data-testid={`button-remove-${index}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newItem = descriptor.defaultArrayItem !== undefined 
                    ? descriptor.defaultArrayItem 
                    : (isObjectArray ? {} : '');
                  setEditValue([...arrayValue, newItem]);
                }}
                className="w-full"
                data-testid="button-add-item"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить пункт
              </Button>
            </div>
          </div>
        );

      case 'object':
        if (!descriptor.objectFields || !editValue) return null;
        return (
          <div className="space-y-4">
            <Label>{descriptor.label}</Label>
            {descriptor.objectFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`edit-obj-${field.key}`} className="text-sm">
                  {field.label}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={`edit-obj-${field.key}`}
                    value={editValue[field.key] || ''}
                    onChange={(e) => setEditValue({ ...editValue, [field.key]: e.target.value })}
                    rows={3}
                    data-testid={`textarea-${field.key}`}
                  />
                ) : field.type === 'number' ? (
                  <Input
                    id={`edit-obj-${field.key}`}
                    type="number"
                    value={editValue[field.key] || 0}
                    onChange={(e) => setEditValue({ ...editValue, [field.key]: parseInt(e.target.value) || 0 })}
                    data-testid={`input-${field.key}`}
                  />
                ) : (
                  <Input
                    id={`edit-obj-${field.key}`}
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={editValue[field.key] || ''}
                    onChange={(e) => setEditValue({ ...editValue, [field.key]: e.target.value })}
                    data-testid={`input-${field.key}`}
                  />
                )}
              </div>
            ))}
          </div>
        );

      default:
        return <p className="text-muted-foreground">Неподдерживаемый тип поля</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" data-testid="dialog-edit">
        <DialogHeader>
          <DialogTitle>Редактировать: {descriptor.label}</DialogTitle>
          <DialogDescription>
            Внесите изменения и нажмите "Сохранить"
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderEditor()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} data-testid="button-cancel">
            Отмена
          </Button>
          <Button onClick={handleSave} data-testid="button-save">
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
