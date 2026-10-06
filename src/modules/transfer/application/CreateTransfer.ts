import type { TransferInput, TransferRepository } from "../domain/TransferRepository.js";

export class CreateTransfer {
  constructor(private readonly repository: TransferRepository, private readonly today: () => string = () => new Date().toISOString().slice(0, 10)) {}

  execute(input: TransferInput) {
    if (input.originClubId && input.destinationClubId && input.originClubId === input.destinationClubId) {
      throw new Error("O clube de origem e o clube de destino devem ser diferentes.");
    }
    const date = input.transferDate ?? this.today();
    if (input.transferWindowId) {
      const window = this.repository.findWindow(input.transferWindowId);
      if (!window) throw new Error("Janela de transferência não encontrada.");
      if (date < window.startDate || date > window.endDate) throw new Error("A data da transferência está fora da janela selecionada.");
    }
    return this.repository.persist(input, date);
  }
}
