import SwiftUI

struct EligibilityFormView: View {
    @Bindable var viewModel: EligibilityViewModel

    var body: some View {
        Form {
            basisSection
            residencySection
            if viewModel.basis == .marriedToCitizen {
                marriageSection
            }
            tripsSection
            selectiveServiceSection
            additionalSection
            if viewModel.basis == .military {
                militarySection
            }
            if !viewModel.validationErrors.isEmpty {
                validationSection
            }
            submitSection
        }
    }

    private var basisSection: some View {
        Section {
            Picker("Basis", selection: $viewModel.basis) {
                Text("General (5 years)").tag(EligibilityBasis.general)
                Text("Married to a U.S. Citizen (3 years)").tag(EligibilityBasis.marriedToCitizen)
                Text("Military Service").tag(EligibilityBasis.military)
            }
        } header: {
            Text("Basis for Eligibility")
        } footer: {
            Text("This is an estimate only, not a legal determination. For military service, USCIS evaluates eligibility case by case.")
        }
    }

    private var residencySection: some View {
        Section("Residency") {
            DatePicker("Green Card Date", selection: $viewModel.greenCardDate, in: ...Date(), displayedComponents: .date)
            TextField("State You Live In", text: $viewModel.state)
                .textInputAutocapitalization(.words)
            DatePicker(
                "Date of Birth",
                selection: Binding(
                    get: { viewModel.birthDate ?? Date() },
                    set: { viewModel.birthDate = $0 }
                ),
                in: ...Date(),
                displayedComponents: .date
            )
        }
    }

    private var marriageSection: some View {
        Section("Marriage") {
            Toggle("Currently married to a U.S. citizen", isOn: $viewModel.marriedToUSCitizen)
            Toggle("My spouse is a U.S. citizen", isOn: $viewModel.spouseIsUSCitizen)
        }
    }

    private var tripsSection: some View {
        Section {
            ForEach(viewModel.trips) { trip in
                tripRow(trip)
            }
            .onDelete { viewModel.removeTrips(at: $0) }

            Button {
                viewModel.addTrip()
            } label: {
                Label("Add Trip", systemImage: "plus.circle.fill")
            }
        } header: {
            Text("Trips Outside the U.S.")
        } footer: {
            Text("Include every trip since your green card date — this affects your physical presence and continuous residence calculations.")
        }
    }

    private func tripRow(_ trip: EligibilityTrip) -> some View {
        let index = viewModel.trips.firstIndex(where: { $0.id == trip.id })
        return VStack(alignment: .leading, spacing: 4) {
            if let index {
                DatePicker(
                    "Departed",
                    selection: Binding(
                        get: { viewModel.trips[index].departDate },
                        set: { viewModel.trips[index].departDate = $0 }
                    ),
                    displayedComponents: .date
                )
                DatePicker(
                    "Returned",
                    selection: Binding(
                        get: { viewModel.trips[index].returnDate },
                        set: { viewModel.trips[index].returnDate = $0 }
                    ),
                    displayedComponents: .date
                )
            }
        }
    }

    private var selectiveServiceSection: some View {
        Section("Selective Service") {
            Picker("Sex", selection: $viewModel.isMale) {
                Text("Select").tag(Bool?.none)
                Text("Male").tag(Bool?.some(true))
                Text("Female").tag(Bool?.some(false))
            }
            triStatePicker("Registered for Selective Service?", selection: $viewModel.selectiveServiceRegisteredAnswer)
        }
    }

    private var additionalSection: some View {
        Section("Additional") {
            triStatePicker("Any good moral character concerns?", selection: $viewModel.goodMoralCharacterConcern)
            triStatePicker("Lived in your filing state 3+ months?", selection: $viewModel.livedInStateThreeMonths)
        }
    }

    private var militarySection: some View {
        Section("Military Service") {
            TextField("Country Served", text: $viewModel.militaryCountryServed)
            Picker("Service Type", selection: $viewModel.militaryServiceType) {
                Text("Select").tag(MilitaryServiceType?.none)
                Text("Mandatory").tag(MilitaryServiceType?.some(.mandatory))
                Text("Voluntary").tag(MilitaryServiceType?.some(.voluntary))
            }
            DatePicker(
                "Service Start",
                selection: Binding(get: { viewModel.militaryServiceStart ?? Date() }, set: { viewModel.militaryServiceStart = $0 }),
                displayedComponents: .date
            )
            DatePicker(
                "Service End",
                selection: Binding(get: { viewModel.militaryServiceEnd ?? Date() }, set: { viewModel.militaryServiceEnd = $0 }),
                displayedComponents: .date
            )
            triStatePicker("Currently serving?", selection: $viewModel.militaryCurrentlyServing)
            triStatePicker("Served in the U.S. Armed Forces?", selection: $viewModel.militaryUSArmedForces)
        }
    }

    private func triStatePicker(_ title: String, selection: Binding<Bool?>) -> some View {
        Picker(title, selection: selection) {
            Text("Not sure / Prefer not to say").tag(Bool?.none)
            Text("Yes").tag(Bool?.some(true))
            Text("No").tag(Bool?.some(false))
        }
    }

    private var validationSection: some View {
        Section {
            ForEach(viewModel.validationErrors, id: \.self) { error in
                Text(error)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
    }

    private var submitSection: some View {
        Section {
            Button {
                Task { await viewModel.submit() }
            } label: {
                if viewModel.phase == .submitting {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                } else {
                    Text("Check Eligibility")
                }
            }
            .disabled(!viewModel.canSubmit)
        }
    }
}
