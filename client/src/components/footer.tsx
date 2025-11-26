import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

export function Footer() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="relative z-50 border-t bg-muted/30 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 Marketplace Courses. Все права защищены.
          </p>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" data-testid="button-offer">
                <FileText className="h-4 w-4 mr-2" />
                Оферта
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Пользовательское соглашение (Публичная оферта)</DialogTitle>
                <DialogDescription>
                  Официальное предложение ООО «Marketplace Courses»
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6 text-sm">
                  <p>
                    Настоящий документ является официальным предложением (публичной офертой) ООО «Marketplace Courses» (далее — «Исполнитель») любому заинтересованному лицу (далее — «Пользователь») заключить договор на условиях, изложенных ниже.
                  </p>

                  <div>
                    <h3 className="font-semibold text-base mb-2">1. Общие положения</h3>
                    <div className="space-y-2">
                      <p>
                        1.1. Исполнитель оказывает информационно-консультационные услуги, связанные с техническим обеспечением участия Пользователя в закрытом сообществе, направленном на совместное изучение информационных материалов, включая курсы, обзоры, аналитические отчеты, иное.
                      </p>
                      <p>
                        1.2. Услуги Исполнителя не включают реализацию или передачу авторских прав, лицензий, файлов или прямого доступа к контенту третьих лиц. Исполнитель не осуществляет продажу цифрового контента.
                      </p>
                      <p>
                        1.3. В рамках услуг Исполнитель предоставляет техническое сопровождение, организационный доступ к сообществу, а также консультации по вопросам взаимодействия между участниками.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-2">2. Условия доступа</h3>
                    <div className="space-y-2">
                      <p>
                        2.1. Доступ к информационному сообществу осуществляется через сторонние платформы (включая Telegram), администрируемые на добровольной основе и вне прямого управления Исполнителя.
                      </p>
                      <p>
                        2.2. Все материалы, размещаемые в сообществах, передаются участниками на добровольной основе, и Исполнитель не осуществляет их предварительную модерацию, проверку на авторские права или контроль за использованием.
                      </p>
                      <p>
                        2.3. Пользователь принимает на себя обязательство использовать доступ исключительно в личных, некоммерческих целях.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-2">3. Платежи</h3>
                    <div className="space-y-2">
                      <p>
                        3.1. Платеж, совершаемый Пользователем, является вознаграждением за информационно-консультационные услуги, техническое сопровождение и поддержку доступа к сообществу. Платеж не является оплатой за доступ к конкретному контенту.
                      </p>
                      <p>
                        3.2. Возврат платежей возможен только в случае полной технической невозможности предоставления доступа к сообществу по вине Исполнителя.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-2">4. Ответственность сторон</h3>
                    <div className="space-y-2">
                      <p>
                        4.1. Исполнитель не несет ответственности за действия участников сообщества, за содержание материалов, передаваемых в рамках сообщества, а также за соответствие таких материалов законодательству РФ.
                      </p>
                      <p>
                        4.2. Вся ответственность за возможное нарушение авторских и иных прав третьих лиц при использовании информации из сообщества возлагается на соответствующего участника.
                      </p>
                      <p>
                        4.3. Пользователь обязуется не распространять, не копировать и не использовать материалы сообщества в коммерческих целях или с нарушением законодательства РФ.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-base mb-2">6. Прочие положения</h3>
                    <div className="space-y-2">
                      <p>
                        6.1. Настоящее соглашение является публичной офертой в соответствии со статьей 437 ГК РФ.
                      </p>
                      <p>
                        6.2. Акцепт оферты (оплата, регистрация, обращение к Исполнителю) означает полное и безоговорочное принятие всех условий настоящего соглашения.
                      </p>
                      <p>
                        6.3. Все споры по настоящему соглашению разрешаются в соответствии с законодательством РФ, при обязательном досудебном порядке.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="font-semibold">ООО «Marketplace Courses»</p>
                    <p className="text-muted-foreground">г. Москва</p>
                    <p className="text-muted-foreground">2025 г.</p>
                  </div>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </footer>
  );
}
