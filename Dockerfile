FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["backend/ChatSystem.API/ChatSystem.API.csproj", "backend/ChatSystem.API/"]
RUN dotnet restore "backend/ChatSystem.API/ChatSystem.API.csproj"
COPY backend/ChatSystem.API/ backend/ChatSystem.API/
WORKDIR "/src/backend/ChatSystem.API"
RUN dotnet publish "ChatSystem.API.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ChatSystem.API.dll"]
