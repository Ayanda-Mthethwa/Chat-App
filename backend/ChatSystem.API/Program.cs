using Microsoft.EntityFrameworkCore;
using ChatSystem.API.Data;
using ChatSystem.API.Hubs;
using ChatSystem.API.Models;
using ChatSystem.API.Services; // Ensure this is here for TokenService
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- 1. SERVICES CONFIGURATION (Before builder.Build) ---

// Database Context (PostgreSQL)
// Render provides connection string as a URI (postgres://...), convert to Npgsql key-value format
var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
var connectionString = rawConnectionString;
if (rawConnectionString.StartsWith("postgres://") || rawConnectionString.StartsWith("postgresql://"))
{
    var uri = new Uri(rawConnectionString);
    var userInfo = uri.UserInfo.Split(':');
    connectionString = $"Host={uri.Host};Port={Math.Max(uri.Port, 5432)};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={Uri.UnescapeDataString(userInfo[1])};SSL Mode=Require;Trust Server Certificate=true";
}
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

// SignalR for Real-Time
builder.Services.AddSignalR();

// Controllers and Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register our Custom Token Service
builder.Services.AddScoped<TokenService>();

// Configure JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => 
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["TokenKey"] ?? "A_Very_Long_Super_Secret_Key_At_Least_32_Chars")),
            ValidateIssuer = false,
            ValidateAudience = false
        };

        // SignalR Token Handling
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context => 
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

// CORS Policy — origins from config so production URL can be injected via env var
var allowedOrigins = builder.Configuration["AllowedOrigins"]?.Split(',')
    ?? new[] { "http://localhost:4200" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// --- 2. APP BUILDING ---

var app = builder.Build();

// --- 3. MIDDLEWARE PIPELINE (Order Matters!) ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Auto-create tables on first run (no migrations needed)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.EnsureCreated();
}

// UseCors must come BEFORE Authentication
app.UseCors("AllowAngular");

// Authentication must come BEFORE Authorization
app.UseAuthentication(); 
app.UseAuthorization();

app.MapControllers();

// Map SignalR Hubs
app.MapHub<PresenceHub>("/hubs/presence");
app.MapHub<ChatHub>("/hubs/chat");

app.Run();