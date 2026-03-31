import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShoppingBag, BookOpen, Crown, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  isVip?: boolean;
  onGoToCourse: () => void;
  onContinueShopping: () => void;
}

export function SuccessDialog({
  open,
  onOpenChange,
  title,
  description,
  isVip = false,
  onGoToCourse,
  onContinueShopping,
}: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-success">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-chart-2/10 flex items-center justify-center">
            {isVip ? (
              <Crown className="h-8 w-8 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-chart-2" />
            )}
          </div>
          <DialogTitle className="text-2xl" data-testid="text-success-title">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base" data-testid="text-success-description">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Инструкции что делать дальше */}
        <Alert className="border-primary/20 bg-primary/5 mt-4" data-testid="alert-next-steps">
          <AlertDescription className="text-sm space-y-2">
            <div className="font-semibold text-foreground mb-2">Что делать дальше:</div>
            {isVip ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p className="text-muted-foreground">Свяжитесь с <a href="https://t.me/kurs_helper">администрацией</a> для активации</p>
                </div>

                {/* <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p className="text-muted-foreground">Перейдите в библиотеку и найдите ваш VIP пакет</p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p className="text-muted-foreground">Откройте VIP пакет и выберите курсы из доступных</p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p className="text-muted-foreground">Начните обучение прямо сейчас - курсы доступны без ограничений</p>
                </div> */}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p className="text-muted-foreground">Курс добавлен в вашу библиотеку</p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p className="text-muted-foreground">Откройте библиотеку и начните обучение</p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <p className="text-muted-foreground">Все видеоуроки доступны для просмотра в любое время</p>
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <DialogFooter className="flex-col sm:flex-col gap-3 mt-4">
          <Button
            className="w-full"
            onClick={onGoToCourse}
            data-testid="button-go-to-course"
          >
            {isVip ? (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Связаться с администрацией
              </>
            ) : (
              <>
                <BookOpen className="mr-2 h-4 w-4" />
                Перейти в библиотеку
              </>
            )}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onContinueShopping}
            data-testid="button-continue-shopping"
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            {isVip ? "В библиотеку" : "Продолжить покупки"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
