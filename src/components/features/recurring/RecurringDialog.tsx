'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { RecurringTask, RecurrenceType } from '@/schemas/recurring-task';
import type { Category } from '@/types/supabase';
import { toast } from 'sonner';

interface RecurringTaskWithRelations extends RecurringTask {
  category?: Category | null;
}

interface RecurringSaveData {
  workspace_id?: string;
  title: string;
  description?: string;
  category_id?: string;
  priority: number;
  recurrence_type: RecurrenceType;
  interval_days?: number;
  days_of_week?: number[];
  day_of_month?: number;
  month_of_year?: number;
  start_date: string;
  end_date?: string;
  next_due_date: string;
  is_active?: boolean;
}

interface RecurringDialogProps {
  recurringTask: RecurringTaskWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<RecurringTask>;
  categories?: Category[];
  onSave: (data: RecurringSaveData) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  recurrence_type: z.enum([
    'interval_from_completion',
    'fixed_daily',
    'fixed_weekly',
    'fixed_monthly',
    'fixed_yearly',
  ]),
  interval_days: z.number().int().min(1).optional(),
  days_of_week: z.array(z.number()).optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),
  month_of_year: z.number().int().min(1).max(12).optional(),
  start_date: z.date(),
  end_date: z.date().optional(),
  never_end: z.boolean(),
  is_active: z.boolean(),
  priority: z.number().int().min(0).max(3),
});

type FormValues = z.infer<typeof formSchema>;

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function RecurringDialogContent({
  recurringTask,
  onOpenChange,
  defaultValues,
  categories,
  onSave,
  onDelete,
}: Omit<RecurringDialogProps, 'open'>) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: recurringTask
      ? {
          title: recurringTask.title,
          description: recurringTask.description || '',
          category_id: recurringTask.category_id || undefined,
          recurrence_type: recurringTask.recurrence_type,
          interval_days: recurringTask.interval_days || undefined,
          days_of_week: recurringTask.days_of_week || undefined,
          day_of_month: recurringTask.day_of_month || undefined,
          month_of_year: recurringTask.month_of_year || undefined,
          start_date: new Date(recurringTask.start_date),
          end_date: recurringTask.end_date
            ? new Date(recurringTask.end_date)
            : undefined,
          never_end: !recurringTask.end_date,
          is_active: recurringTask.is_active,
          priority: recurringTask.priority,
        }
      : {
          title: defaultValues?.title || '',
          description: '',
          recurrence_type: 'fixed_daily',
          interval_days: 1,
          start_date: new Date(),
          never_end: true,
          is_active: true,
          priority: 0,
        },
  });

  const recurrenceType = form.watch('recurrence_type');
  const neverEnd = form.watch('never_end');

  // Reset conditional fields when recurrence type changes
  useEffect(() => {
    form.setValue('interval_days', undefined);
    form.setValue('days_of_week', undefined);
    form.setValue('day_of_month', undefined);
    form.setValue('month_of_year', undefined);

    // Set defaults based on type
    if (recurrenceType === 'fixed_daily') {
      form.setValue('interval_days', 1);
    } else if (recurrenceType === 'interval_from_completion') {
      form.setValue('interval_days', 2);
    } else if (recurrenceType === 'fixed_weekly') {
      form.setValue('days_of_week', [0]); // Monday
    } else if (recurrenceType === 'fixed_monthly') {
      form.setValue('day_of_month', 1);
    } else if (recurrenceType === 'fixed_yearly') {
      const today = new Date();
      form.setValue('month_of_year', today.getMonth() + 1);
      form.setValue('day_of_month', today.getDate());
    }
  }, [recurrenceType, form]);

  const handleSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
      // Destructure to exclude never_end from submitted data
      const { never_end, ...restData } = data;

      const submitData = {
        ...restData,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date:
          never_end || !data.end_date
            ? undefined
            : format(data.end_date, 'yyyy-MM-dd'),
        next_due_date: format(data.start_date, 'yyyy-MM-dd'),
      };

      await onSave(submitData);
      toast.success(
        recurringTask ? 'Recurring task updated' : 'Recurring task created'
      );
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save recurring task', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recurringTask || !onDelete) return;

    try {
      await onDelete(recurringTask.id);
      toast.success('Recurring task deleted');
      onOpenChange(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete recurring task', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  return (
    <>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {recurringTask ? 'Edit Recurring Task' : 'Create Recurring Task'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6 py-4"
        >
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                {...form.register('title')}
                placeholder="e.g., Clean cat litter"
              />
              {form.formState.errors.title && (
                <p className="text-destructive text-sm">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Add details..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.watch('category_id') || 'none'}
                onValueChange={(value) =>
                  form.setValue(
                    'category_id',
                    value === 'none' ? undefined : value
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurrence Pattern */}
          <div className="space-y-4">
            <h3 className="font-medium">Recurrence Pattern</h3>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.watch('recurrence_type')}
                onValueChange={(value) =>
                  form.setValue(
                    'recurrence_type',
                    value as FormValues['recurrence_type']
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interval_from_completion">
                    After X days
                  </SelectItem>
                  <SelectItem value="fixed_daily">Daily</SelectItem>
                  <SelectItem value="fixed_weekly">Weekly</SelectItem>
                  <SelectItem value="fixed_monthly">Monthly</SelectItem>
                  <SelectItem value="fixed_yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional fields based on recurrence type */}
            {(recurrenceType === 'interval_from_completion' ||
              recurrenceType === 'fixed_daily') && (
              <div className="space-y-2">
                <Label>
                  {recurrenceType === 'interval_from_completion'
                    ? 'Days after completion'
                    : 'Every X days'}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={form.watch('interval_days') || ''}
                  onChange={(e) =>
                    form.setValue(
                      'interval_days',
                      parseInt(e.target.value) || 1
                    )
                  }
                />
              </div>
            )}

            {recurrenceType === 'fixed_weekly' && (
              <div className="space-y-2">
                <Label>Days of week</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_NAMES.map((day, index) => {
                    const isChecked =
                      form.watch('days_of_week')?.includes(index) || false;
                    return (
                      <label
                        key={day}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                          isChecked &&
                            'bg-primary text-primary-foreground border-primary'
                        )}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const current = form.watch('days_of_week') || [];
                            if (checked) {
                              form.setValue('days_of_week', [
                                ...current,
                                index,
                              ]);
                            } else {
                              form.setValue(
                                'days_of_week',
                                current.filter((d) => d !== index)
                              );
                            }
                          }}
                        />
                        {day}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {recurrenceType === 'fixed_monthly' && (
              <div className="space-y-2">
                <Label>Day of month</Label>
                <Select
                  value={form.watch('day_of_month')?.toString() || '1'}
                  onValueChange={(value) =>
                    form.setValue('day_of_month', parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day === 31
                          ? 'Last day'
                          : `${day}${getOrdinalSuffix(day)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {recurrenceType === 'fixed_yearly' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select
                    value={form.watch('month_of_year')?.toString() || '1'}
                    onValueChange={(value) =>
                      form.setValue('month_of_year', parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_NAMES.map((month, index) => (
                        <SelectItem key={month} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={form.watch('day_of_month') || ''}
                    onChange={(e) =>
                      form.setValue(
                        'day_of_month',
                        parseInt(e.target.value) || 1
                      )
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="font-medium">Schedule</h3>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(form.watch('start_date'), 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('start_date')}
                    onSelect={(date) =>
                      date && form.setValue('start_date', date)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>End Date</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor="never-end" className="text-sm font-normal">
                    Never end
                  </Label>
                  <Switch
                    id="never-end"
                    checked={form.watch('never_end')}
                    onCheckedChange={(checked) =>
                      form.setValue('never_end', checked)
                    }
                  />
                </div>
              </div>

              {!neverEnd && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch('end_date')
                        ? format(form.watch('end_date')!, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.watch('end_date')}
                      onSelect={(date) => form.setValue('end_date', date)}
                      initialFocus
                      disabled={(date) => date < form.watch('start_date')}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is-active">Active</Label>
              <p className="text-muted-foreground text-xs">
                {form.watch('is_active')
                  ? 'New tasks will be created automatically'
                  : 'No new tasks will be created'}
              </p>
            </div>
            <Switch
              id="is-active"
              checked={form.watch('is_active')}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
            />
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            {recurringTask && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring task?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the recurring task template and all uncompleted
              instances. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RecurringDialog({
  recurringTask,
  open,
  onOpenChange,
  defaultValues,
  categories,
  onSave,
  onDelete,
}: RecurringDialogProps) {
  if (!open) return null;

  return (
    <Dialog
      key={recurringTask?.id || 'new'}
      open={open}
      onOpenChange={onOpenChange}
    >
      <RecurringDialogContent
        recurringTask={recurringTask}
        onOpenChange={onOpenChange}
        defaultValues={defaultValues}
        categories={categories}
        onSave={onSave}
        onDelete={onDelete}
      />
    </Dialog>
  );
}
