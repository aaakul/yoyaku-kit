export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(payload: EmailPayload): Promise<EmailSendResult>;
}

export interface ReservationEmailData {
  reservationId: string;
  reservationNumber?: string;
  cancellationToken: string;
  restaurantName: string;
  restaurantAddress?: string | null;
  restaurantPhone?: string | null;
  cancellationCutoffHours?: number;
  customerName: string;
  customerEmail: string;
  partySize: number;
  startAt: Date;
  endAt: Date;
  tableName?: string;
  note?: string | null;
}
