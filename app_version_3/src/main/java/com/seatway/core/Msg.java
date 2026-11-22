package com.seatway.core;

/**
 * All messages the server can show to a traveller, in Polish and English.
 * "{0}" is replaced by the first argument.
 */
public enum Msg {

    ROUTE_NOT_SERVED("To połączenie nie jedzie na tej trasie.",
            "This train does not run on this route."),
    PLACE_NOT_FOUND("Nie znaleziono tego miejsca.",
            "This place was not found."),
    NO_DATA("Brak danych rezerwacji.",
            "Booking data is missing."),
    NAME_REQUIRED("Wpisz imię i nazwisko pasażera, żebyśmy mogli przygotować bilet.",
            "Enter the passenger's full name so we can prepare the ticket."),
    NAME_LENGTH("Imię i nazwisko powinno mieć od 2 do 80 znaków.",
            "The name should have 2 to 80 characters."),
    CONTACT_LENGTH("Kontakt jest za długi (najwyżej 100 znaków).",
            "The contact is too long (maximum 100 characters)."),
    RUN_REQUIRED("Wybierz połączenie.",
            "Choose a train."),
    DEPARTED("Ten pociąg już odjechał. Wybierz późniejsze połączenie.",
            "This train has already left. Choose a later one."),
    PLACE_NOT_ON_ROUTE("To miejsce nie leży na trasie tego pociągu.",
            "This place is not on this train's route."),
    NEXT_RUN_REQUIRED("Brakuje pociągu, którym pojedziesz dalej.",
            "The onward train is missing."),
    NEXT_RUN_WRONG("Ten pociąg nie jedzie dalej z tej stacji.",
            "This train does not continue from this station."),
    NOT_ENOUGH_TIME("Za mało czasu na zwiedzanie i bezpieczny powrót na pociąg.",
            "There is not enough time to visit and safely catch the next train."),
    FULL("To połączenie jest już pełne. Wybierz inne połączenie.",
            "This train is full. Choose another one."),
    RUN_NOT_FOUND("Nie znaleziono tego połączenia.",
            "This train was not found."),
    FROM_REQUIRED("Wybierz stację, z której jedziesz.",
            "Choose the station you are leaving from."),
    TO_REQUIRED("Wybierz stację, do której jedziesz.",
            "Choose the station you are going to."),
    SAME_STATION("Stacja początkowa i docelowa muszą być różne.",
            "The departure and destination stations must be different."),
    DATE_REQUIRED("Wybierz datę podróży.",
            "Choose the travel date."),
    DATE_PAST("Ta data już minęła. Wybierz dzisiejszą lub późniejszą datę.",
            "This date has passed. Choose today or a later date."),
    DATE_TOO_FAR("Rezerwacje są możliwe najwyżej 60 dni naprzód.",
            "Bookings are possible up to 60 days ahead."),
    NO_STOP("Ta podróż nie ma przystanku po drodze.",
            "This trip has no stop on the way."),
    TRIP_NOT_FOUND("Nie znaleziono podróży o numerze {0}.",
            "No trip was found with the number {0}."),
    ALREADY_CANCELLED("Ta podróż jest już odwołana.",
            "This trip is already cancelled."),
    DAY_PASSED("Tej podróży nie można już zmienić, bo jej dzień minął.",
            "This trip can no longer be changed because its day has passed."),
    PAYMENT_METHOD("Wybierz sposób płatności.",
            "Choose a payment method."),
    PAYMENT_INVALID_AMOUNT("Nieprawidłowa kwota płatności.",
            "Invalid payment amount."),
    PAYMENT_REQUIRED("Najpierw opłać bilet. Bez płatności rezerwacja nie jest możliwa.",
            "Please pay for the ticket first. A booking is not possible without payment."),
    PAYMENT_AMOUNT("Kwota płatności nie zgadza się z ceną biletu. Nic nie zostało pobrane – spróbuj ponownie.",
            "The payment amount does not match the ticket price. Nothing was charged – please try again."),
    BAD_REQUEST("Nieprawidłowe dane. Spróbuj jeszcze raz.",
            "Invalid data. Please try again."),
    PAGE_NOT_FOUND("Nie znaleziono strony.",
            "Page not found."),
    SERVER_ERROR("Coś poszło nie tak po naszej stronie. Nic nie zostało zarezerwowane. Spróbuj ponownie za chwilę.",
            "Something went wrong on our side. Nothing was booked. Please try again in a moment.");

    private final String pl;
    private final String en;

    Msg(String pl, String en) {
        this.pl = pl;
        this.en = en;
    }

    /** The message in the given language ("en" or anything else = Polish). */
    public String text(String lang, Object... args) {
        String s = Lang.EN.equals(lang) ? en : pl;
        for (int i = 0; i < args.length; i++) {
            s = s.replace("{" + i + "}", String.valueOf(args[i]));
        }
        return s;
    }

    /** Supported languages. Polish is the default. */
    public static final class Lang {
        public static final String PL = "pl";
        public static final String EN = "en";

        private Lang() {
        }

        /** Turns any language tag (e.g. "en-GB", "pl-PL") into "en" or "pl". */
        public static String of(String tag) {
            return tag != null && tag.toLowerCase().startsWith("en") ? EN : PL;
        }
    }
}
