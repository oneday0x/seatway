console.log("JavaScript file loaded");
const message = document.getElementById("reservation-message");
const passengerNameInput = document.getElementById("passenger-name");
const passengerNameError = document.getElementById("passenger-name-error");
const tripList = document.getElementById("trip-list");
const destinationSearch =
    document.getElementById("destination-search");
const searchStatus =
    document.getElementById("search-status");
const clearSelectionButton = document.getElementById("clear-selection");
const selectionSummary = document.getElementById("selection-summary");
const summaryPassenger = document.getElementById("summary-passenger");
const summaryRoute = document.getElementById("summary-route");
const summaryDeparture = document.getElementById("summary-departure");
const summaryArrival = document.getElementById("summary-arrival");
const summaryPrice = document.getElementById("summary-price");
const confirmReservationButton =
    document.getElementById("confirm-reservation");
const reservationList = document.getElementById("reservation-list");

const trips = [
    {
        origin: "Wrocław",
        destination: "Kraków",
        departure: "09:00",
        arrival: "12:00",
        price: 69
    },
    {
        origin: "Warszawa",
        destination: "Gdańsk",
        departure: "13:00",
        arrival: "17:00",
        price: 52
    },
    {
        origin: "Poznań",
        destination: "Zakopane",
        departure: "06:00",
        arrival: "10:30",
        price: 75
    }
];
let selectedTrip = null;
const reservations = [];

function showSelectedTrip(trip) {
    const passengerName = passengerNameInput.value.trim();

    if (passengerName === "") {
        clearSelectedTrip();
        passengerNameError.textContent = "Please enter your name.";

        passengerNameInput.classList.add("input-error");
        passengerNameInput.setAttribute("aria-invalid", "true");
        passengerNameInput.focus();
        passengerNameInput.classList.add("error-pulse");
        return;
    }

    passengerNameError.textContent = "";
    passengerNameInput.classList.remove("input-error");
    passengerNameInput.setAttribute("aria-invalid", "false");

    selectedTrip = trip;
    summaryPassenger.textContent = passengerName;
    summaryRoute.textContent = trip.origin + " → " + trip.destination;
    summaryDeparture.textContent = trip.departure;
    summaryArrival.textContent = trip.arrival;
    summaryPrice.textContent = trip.price + " PLN";

    selectionSummary.hidden = false;

    clearSelectionButton.hidden = false;

    message.textContent =
        passengerName + ", you selected the trip from " +
        trip.origin + " to " + trip.destination +
        ". Price: " + trip.price + " PLN.";

    console.log("Selected trip:", selectedTrip);
}

function clearSelectedTrip() {
    selectedTrip = null;
    message.textContent = "";
    selectionSummary.hidden = true;
    clearSelectionButton.hidden = true;
}

passengerNameInput.addEventListener("animationend", function () {
    passengerNameInput.classList.remove("error-pulse");
});

passengerNameInput.addEventListener("input", function () {
    clearSelectedTrip();
    if (passengerNameInput.value.trim() !== "") {
        passengerNameError.textContent = "";
        passengerNameInput.classList.remove("input-error", "error-pulse");
        passengerNameInput.setAttribute("aria-invalid", "false");
    }
});


function renderTrips(tripsToDisplay) {
    tripList.replaceChildren();

    if (tripsToDisplay.length === 0) {
        searchStatus.textContent = "No trips found. Try another destination.";
    } else {
        const tripWord = tripsToDisplay.length === 1 ? "trip" : "trips";

        searchStatus.textContent =
            tripsToDisplay.length + " " + tripWord + " found.";
    }

    tripsToDisplay.forEach(function (trip) {
        const card = document.createElement("article");

        const title = document.createElement("h3");
        title.textContent = trip.origin + " to " + trip.destination;

        const departure = document.createElement("p");
        departure.textContent = "Departure: " + trip.departure;

        const arrival = document.createElement("p");
        arrival.textContent = "Arrival: " + trip.arrival;

        const price = document.createElement("p");
        price.textContent = "Price: " + trip.price + " PLN";

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Select trip";

        button.addEventListener("click", function () {
            showSelectedTrip(trip);
        });

        card.append(title, departure, arrival, price, button);
        tripList.append(card);
    });
}

renderTrips(trips);

destinationSearch.addEventListener("input", function () {
    const searchText = destinationSearch.value.trim().toLowerCase();

    const matchingTrips = trips.filter(function (trip) {
        return trip.destination.toLowerCase().includes(searchText);
    });

    renderTrips(matchingTrips);
    clearSelectedTrip();
});

clearSelectionButton.addEventListener("click", function () {
    clearSelectedTrip();
});

confirmReservationButton.addEventListener("click", function () {
    if (selectedTrip === null) {
        return;
    }

    const reservation = {
        passengerName: passengerNameInput.value.trim(),
        trip: selectedTrip
    };

    reservations.push(reservation);
    renderReservations();

    clearSelectedTrip();

    message.textContent =
        "Demo reservation confirmed for " +
        reservation.passengerName + ": " +
        reservation.trip.origin + " → " +
        reservation.trip.destination + ".";

    console.log("Reservations:", reservations);
});

function renderReservations() {
    reservationList.replaceChildren();

    if (reservations.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "You have no demo reservations yet.";
        reservationList.append(emptyMessage);
        return;
    }

    reservations.forEach(function (reservation) {
        const card = document.createElement("article");

        const route = document.createElement("h3");
        route.textContent =
            reservation.trip.origin + " → " +
            reservation.trip.destination;

        const passenger = document.createElement("p");
        passenger.textContent =
            "Passenger: " + reservation.passengerName;

        const departure = document.createElement("p");
        departure.textContent =
            "Departure: " + reservation.trip.departure;

        const price = document.createElement("p");
        price.textContent =
            "Price: " + reservation.trip.price + " PLN";

        card.append(route, passenger, departure, price);
        reservationList.append(card);
    });
}

renderReservations();